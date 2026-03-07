"""
LOLA Engine — Module 2: Drift Detector

Detects meaningful deviation from personal baselines.
- Warning threshold: >1.5σ
- Alert threshold: >2σ sustained 3+ days
- Auto-labels context: travel, seasonal, unknown
- Outputs drift_event payload for downstream agents (Jayden's Nutritionist, Hudson's Diagnostician)
- Persists drift history as drift_events.json
"""

import json
import numpy as np
import pandas as pd
from pathlib import Path
from dataclasses import dataclass, asdict, field
from typing import Optional

from data_loader import load_all, DATA_DIR
from baseline_calculator import (
    compute_all_baselines,
    BaselinePoint,
    save_baseline_state,
)

# ── Thresholds ───────────────────────────────────────────────────

WARNING_SIGMA = 1.5
ALERT_SIGMA = 2.0
ALERT_SUSTAINED_DAYS = 3

# Warmup: ignore drift during the first N days while baseline is forming
# The rapid loss phase (105→93) is real but not "drift" — it's the initial trajectory
WARMUP_DAYS = 90

# Confidence scoring: higher sigma + longer duration = higher confidence
MAX_CONFIDENCE = 0.99


# ── Drift Event ──────────────────────────────────────────────────

@dataclass
class DriftEvent:
    """A detected drift event — the core payload downstream agents consume."""
    metric: str
    start_date: str
    end_date: str
    peak_date: str
    baseline_mean: float
    baseline_std: float
    peak_value: float
    deviation_sigma: float
    duration_days: int
    direction: str  # "up" or "down"
    confidence: float
    severity: str  # "warning" or "alert"
    context_label: str  # "Travel Disruption", "Holiday Drift", "Summer Drift", etc.
    causal_context: str  # machine-readable: "travel_event", "seasonal_pattern", "unknown"
    is_travel: bool
    season_label: str
    values: list[float] = field(default_factory=list)  # actual values during drift


def _compute_confidence(sigma: float, duration: int) -> float:
    """
    Confidence score: combines deviation magnitude and persistence.
    - 1.5σ for 1 day ≈ 0.40
    - 2.0σ for 3 days ≈ 0.75
    - 3.0σ for 7 days ≈ 0.95
    """
    # Sigmoid-like scaling
    sigma_factor = min(sigma / 4.0, 1.0)  # saturates at 4σ
    duration_factor = min(duration / 10.0, 1.0)  # saturates at 10 days
    raw = 0.6 * sigma_factor + 0.4 * duration_factor
    return round(min(raw, MAX_CONFIDENCE), 2)


def _classify_context(
    is_travel: bool,
    season: str,
    direction: str,
) -> tuple[str, str]:
    """
    Assign context_label and causal_context based on flags.
    Returns (context_label, causal_context).
    """
    if is_travel:
        return "Travel Disruption", "travel_event"

    if season == "Holiday":
        if direction == "up":
            return "Holiday Drift", "seasonal_pattern"
        return "Holiday Recovery", "seasonal_pattern"

    if season == "Summer":
        return "Summer Drift", "seasonal_pattern"

    if season == "Autumn":
        return "Autumn Creep", "seasonal_pattern"

    return "Unexplained Drift", "unknown"


# ── Core Detection ───────────────────────────────────────────────

def detect_drift_events(
    baselines: dict[str, list[BaselinePoint]],
) -> list[DriftEvent]:
    """
    Scan all baseline points for drift events.

    Algorithm:
    1. Walk through each day. If deviation > WARNING_SIGMA, start tracking.
    2. Continue tracking while deviation stays above WARNING_SIGMA.
    3. When deviation drops below WARNING_SIGMA, close the event.
    4. Classify severity: if peak >= ALERT_SIGMA and duration >= ALERT_SUSTAINED_DAYS → alert.
    5. Label context from travel + season flags.
    """
    all_events = []

    for metric, points in baselines.items():
        # Skip warmup period — baseline not yet calibrated
        if points:
            first_date = pd.Timestamp(points[0].date)
            warmup_cutoff = first_date + pd.Timedelta(days=WARMUP_DAYS)
        else:
            warmup_cutoff = None

        # Active drift tracking state
        in_drift = False
        drift_start = None
        drift_points: list[BaselinePoint] = []
        drift_values: list[float] = []
        drift_sigmas: list[float] = []

        for pt in points:
            # Skip warmup period
            if warmup_cutoff and pd.Timestamp(pt.date) < warmup_cutoff:
                continue

            if not pt.is_valid or pt.actual_value is None:
                # If we were tracking a drift, close it on data gap
                if in_drift and drift_points:
                    event = _close_drift_event(
                        metric, drift_points, drift_values, drift_sigmas
                    )
                    if event:
                        all_events.append(event)
                    in_drift = False
                    drift_points = []
                    drift_values = []
                    drift_sigmas = []
                continue

            # Compute deviation in sigma units
            deviation = abs(pt.actual_value - pt.baseline_mean) / pt.baseline_std
            direction = "up" if pt.actual_value > pt.baseline_mean else "down"

            if deviation >= WARNING_SIGMA:
                if not in_drift:
                    in_drift = True
                    drift_start = pt.date
                drift_points.append(pt)
                drift_values.append(pt.actual_value)
                drift_sigmas.append(deviation if direction == "up" else -deviation)
            else:
                # Deviation dropped below threshold — close event if active
                if in_drift and drift_points:
                    event = _close_drift_event(
                        metric, drift_points, drift_values, drift_sigmas
                    )
                    if event:
                        all_events.append(event)
                in_drift = False
                drift_points = []
                drift_values = []
                drift_sigmas = []

        # Close any remaining open drift at end of data
        if in_drift and drift_points:
            event = _close_drift_event(metric, drift_points, drift_values, drift_sigmas)
            if event:
                all_events.append(event)

    # Sort by date
    all_events.sort(key=lambda e: e.start_date)
    return all_events


def _close_drift_event(
    metric: str,
    points: list[BaselinePoint],
    values: list[float],
    sigmas: list[float],
) -> Optional[DriftEvent]:
    """Finalize a drift event from accumulated tracking data."""
    if not points:
        return None

    # Find peak deviation
    abs_sigmas = [abs(s) for s in sigmas]
    peak_idx = int(np.argmax(abs_sigmas))
    peak_sigma = abs_sigmas[peak_idx]
    peak_value = values[peak_idx]
    peak_date = points[peak_idx].date

    # Direction: determined by the majority of deviation signs
    direction = "up" if sum(1 for s in sigmas if s > 0) > len(sigmas) / 2 else "down"

    duration = len(points)

    # Severity
    if peak_sigma >= ALERT_SIGMA and duration >= ALERT_SUSTAINED_DAYS:
        severity = "alert"
    else:
        severity = "warning"

    # Context classification
    # Use the most common travel/season flags across the drift window
    travel_count = sum(1 for p in points if p.is_travel)
    is_travel = travel_count > len(points) / 2

    seasons = [p.season_label for p in points]
    season_mode = max(set(seasons), key=seasons.count)

    context_label, causal_context = _classify_context(is_travel, season_mode, direction)

    confidence = _compute_confidence(peak_sigma, duration)

    return DriftEvent(
        metric=metric,
        start_date=points[0].date,
        end_date=points[-1].date,
        peak_date=peak_date,
        baseline_mean=points[peak_idx].baseline_mean,
        baseline_std=points[peak_idx].baseline_std,
        peak_value=peak_value,
        deviation_sigma=round(peak_sigma, 2),
        duration_days=duration,
        direction=direction,
        confidence=confidence,
        severity=severity,
        context_label=context_label,
        causal_context=causal_context,
        is_travel=is_travel,
        season_label=season_mode,
        values=values,
    )


# ── Persistence ──────────────────────────────────────────────────

def save_drift_events(events: list[DriftEvent], path: Optional[Path] = None):
    """Save drift events to JSON."""
    out_path = path or DATA_DIR / "drift_events.json"
    payload = [asdict(e) for e in events]
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2, default=str)
    print(f"  Saved {len(events)} drift events → {out_path}")
    return out_path


# ── Query helpers (for API layer) ────────────────────────────────

def get_recent_drift(events: list[DriftEvent], days: int = 30) -> list[dict]:
    """Get drift events from the last N days."""
    cutoff = (pd.Timestamp.now() - pd.Timedelta(days=days)).isoformat()[:10]
    return [asdict(e) for e in events if e.end_date >= cutoff]


def get_travel_drift(events: list[DriftEvent]) -> list[dict]:
    """Get all travel-triggered drift events (for Jayden's Nutritionist agent)."""
    return [asdict(e) for e in events if e.is_travel]


def get_drift_summary(events: list[DriftEvent]) -> dict:
    """Summary stats for Hudson's Diagnostician agent."""
    if not events:
        return {"total_events": 0}

    alerts = [e for e in events if e.severity == "alert"]
    travel_events = [e for e in events if e.is_travel]
    by_metric = {}
    for e in events:
        by_metric.setdefault(e.metric, []).append(e)

    worst_by_metric = {}
    for metric, evts in by_metric.items():
        worst = max(evts, key=lambda e: e.deviation_sigma)
        worst_by_metric[metric] = {
            "peak_sigma": worst.deviation_sigma,
            "peak_date": worst.peak_date,
            "context": worst.context_label,
        }

    durations = [e.duration_days for e in events]

    return {
        "total_events": len(events),
        "total_alerts": len(alerts),
        "total_warnings": len(events) - len(alerts),
        "travel_triggered": len(travel_events),
        "avg_duration_days": round(np.mean(durations), 1),
        "max_duration_days": max(durations),
        "worst_by_metric": worst_by_metric,
        "events_by_context": _count_by_field(events, "context_label"),
        "events_by_severity": _count_by_field(events, "severity"),
    }


def _count_by_field(events: list[DriftEvent], field: str) -> dict:
    counts = {}
    for e in events:
        val = getattr(e, field)
        counts[val] = counts.get(val, 0) + 1
    return counts


# ── Main ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Loading data...")
    data = load_all()

    print("Computing baselines...")
    baselines = compute_all_baselines(data)
    save_baseline_state(baselines)

    print("\nDetecting drift events...")
    events = detect_drift_events(baselines)
    save_drift_events(events)

    # Summary
    summary = get_drift_summary(events)
    print(f"\n{'═' * 60}")
    print("DRIFT DETECTION SUMMARY")
    print(f"{'═' * 60}")
    print(f"  Total events: {summary['total_events']}")
    print(f"  Alerts: {summary['total_alerts']}")
    print(f"  Warnings: {summary['total_warnings']}")
    print(f"  Travel-triggered: {summary['travel_triggered']}")
    print(f"  Avg duration: {summary['avg_duration_days']} days")
    print(f"  Max duration: {summary['max_duration_days']} days")
    print(f"\n  By context: {json.dumps(summary['events_by_context'], indent=4)}")
    print(f"\n  Worst by metric: {json.dumps(summary['worst_by_metric'], indent=4)}")

    # Print all events in a table
    print(f"\n{'═' * 60}")
    print("ALL DRIFT EVENTS")
    print(f"{'═' * 60}")
    print(f"{'Metric':<12} {'Start':<12} {'End':<12} {'Days':>5} {'σ':>5} {'Dir':>4} {'Sev':>8} {'Conf':>5} {'Context':<22}")
    print("─" * 100)
    for e in events:
        print(
            f"{e.metric:<12} {e.start_date:<12} {e.end_date:<12} "
            f"{e.duration_days:>5} {e.deviation_sigma:>5.1f} {e.direction:>4} "
            f"{e.severity:>8} {e.confidence:>5.2f} {e.context_label:<22}"
        )

    # Travel drift detail (for Jayden)
    travel = get_travel_drift(events)
    print(f"\n{'═' * 60}")
    print(f"TRAVEL DRIFT EVENTS (for Jayden): {len(travel)}")
    print(f"{'═' * 60}")
    for t in travel:
        print(f"  {t['start_date']} → {t['end_date']} | {t['metric']} | "
              f"σ={t['deviation_sigma']} | {t['duration_days']}d | "
              f"peak={t['peak_value']}")
