"""
LOLA Engine — Module 1: Baseline Calculator

Rolling 90-day personal baseline per metric.
- Adaptive std: tighter when stable, wider during known disruption windows.
- Excludes flagged disruption events (travel, seasonal spikes) from baseline.
- Tags each day with chronobiological season context.
- Outputs: baseline_mean, baseline_std, CI_95 per metric per day.
- Persists as baseline_state.json for downstream agents.

Core thesis: personal longitudinal calibration > population reference ranges.
"""

import json
import numpy as np
import pandas as pd
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional

from data_loader import load_all, DATA_DIR

# ── Configuration ────────────────────────────────────────────────

BASELINE_WINDOW_DAYS = 90
MIN_OBSERVATIONS = 14  # minimum data points to compute a valid baseline
DISRUPTION_EXCLUSION = True  # exclude travel + seasonal spike days from baseline calc
ADAPTIVE_STD_FLOOR = 0.3  # minimum std to prevent unrealistically tight bands (weight_kg)

# Per-metric std floors (prevents false alerts on naturally tight data)
STD_FLOORS = {
    "weight_kg": 0.3,
    "calories": 100.0,
    "steps": 1000.0,
}

# ── Setpoint detection ───────────────────────────────────────────
# The weight plateau at 95–99kg is NOT drift — it's CNS setpoint defense.
# We detect this by checking if the baseline has been stable for 60+ days.
# When in setpoint mode, the baseline adapts more slowly to prevent
# treating the plateau itself as a sustained deviation.

SETPOINT_STABILITY_DAYS = 60  # days of low variance to trigger setpoint mode
SETPOINT_VARIANCE_THRESHOLD = 1.5  # max std to be considered "stable"


@dataclass
class BaselinePoint:
    """Baseline state for a single metric on a single day."""
    date: str
    metric: str
    baseline_mean: float
    baseline_std: float
    ci_95_lower: float
    ci_95_upper: float
    n_observations: int
    is_valid: bool  # enough data points?
    season_label: str
    is_travel: bool
    is_disruption: bool  # excluded from baseline calc
    actual_value: Optional[float]
    in_setpoint_mode: bool


def compute_baseline_series(
    df: pd.DataFrame,
    metric: str,
    window: int = BASELINE_WINDOW_DAYS,
) -> list[BaselinePoint]:
    """
    Compute rolling baseline for a single metric across the full timeline.

    Strategy:
    1. For each day, look back `window` days.
    2. Exclude disruption days (travel + active seasonal spike periods where
       the value is >1σ above the prior clean baseline).
    3. Compute mean and adaptive std from remaining clean observations.
    4. Detect setpoint mode: if last 60 days show low variance, slow adaptation.
    """
    df = df.sort_values("date").reset_index(drop=True)
    results = []

    std_floor = STD_FLOORS.get(metric, 0.1)

    for i, row in df.iterrows():
        date = row["date"]
        actual = row.get(metric)
        is_travel = bool(row.get("is_travel", False))
        season = row.get("season_label", "Normal")

        # Look-back window
        window_start = date - pd.Timedelta(days=window)
        mask = (df["date"] >= window_start) & (df["date"] < date)
        window_df = df.loc[mask].copy()

        # Get raw values in window
        raw_values = window_df[metric].dropna()

        # Determine which days to exclude from baseline
        if DISRUPTION_EXCLUSION and len(raw_values) > MIN_OBSERVATIONS:
            # Exclude travel days
            clean_mask = ~window_df["is_travel"]

            # Also exclude seasonal days where value spikes
            # (but only if we have enough non-seasonal data to compare)
            non_seasonal_vals = window_df.loc[
                clean_mask & (window_df["season_label"] == "Normal"), metric
            ].dropna()

            if len(non_seasonal_vals) >= MIN_OBSERVATIONS // 2:
                ref_mean = non_seasonal_vals.mean()
                ref_std = max(non_seasonal_vals.std(), std_floor)
                # Exclude seasonal days where value is >1.5σ above reference
                seasonal_mask = window_df["season_label"] != "Normal"
                spike_mask = window_df[metric] > (ref_mean + 1.5 * ref_std)
                clean_mask = clean_mask & ~(seasonal_mask & spike_mask)

            clean_values = window_df.loc[clean_mask, metric].dropna()
        else:
            clean_values = raw_values
            clean_mask = pd.Series(True, index=window_df.index)

        n_obs = len(clean_values)
        is_valid = n_obs >= MIN_OBSERVATIONS

        if is_valid:
            baseline_mean = clean_values.mean()
            baseline_std = max(clean_values.std(), std_floor)

            # Setpoint detection: check if recent baseline is very stable
            recent_start = date - pd.Timedelta(days=SETPOINT_STABILITY_DAYS)
            recent_mask = (df["date"] >= recent_start) & (df["date"] < date)
            recent_clean = df.loc[recent_mask & ~df["is_travel"], metric].dropna()
            in_setpoint = (
                len(recent_clean) >= SETPOINT_STABILITY_DAYS // 2
                and recent_clean.std() < SETPOINT_VARIANCE_THRESHOLD
            )

            # In setpoint mode, widen the std slightly to be more tolerant
            if in_setpoint:
                baseline_std = max(baseline_std, baseline_std * 1.2)

            ci_95_lower = baseline_mean - 1.96 * baseline_std
            ci_95_upper = baseline_mean + 1.96 * baseline_std
        else:
            baseline_mean = raw_values.mean() if len(raw_values) > 0 else np.nan
            baseline_std = raw_values.std() if len(raw_values) > 1 else np.nan
            ci_95_lower = np.nan
            ci_95_upper = np.nan
            in_setpoint = False

        # Is this day a disruption day? (excluded from future baselines)
        is_disruption = is_travel
        if not is_disruption and season != "Normal" and is_valid and pd.notna(actual):
            if actual > baseline_mean + 1.5 * baseline_std:
                is_disruption = True

        results.append(BaselinePoint(
            date=date.isoformat()[:10],
            metric=metric,
            baseline_mean=round(baseline_mean, 3) if pd.notna(baseline_mean) else None,
            baseline_std=round(baseline_std, 3) if pd.notna(baseline_std) else None,
            ci_95_lower=round(ci_95_lower, 3) if pd.notna(ci_95_lower) else None,
            ci_95_upper=round(ci_95_upper, 3) if pd.notna(ci_95_upper) else None,
            n_observations=n_obs,
            is_valid=is_valid,
            season_label=season,
            is_travel=bool(is_travel),
            is_disruption=bool(is_disruption),
            actual_value=round(float(actual), 2) if pd.notna(actual) else None,
            in_setpoint_mode=bool(in_setpoint),
        ))

    return results


def compute_all_baselines(data: dict) -> dict[str, list[BaselinePoint]]:
    """Compute baselines for all available metrics."""
    df = data["daily"]
    metrics = data["metrics"]
    results = {}
    for metric in metrics:
        print(f"  Computing baseline for: {metric}")
        results[metric] = compute_baseline_series(df, metric)
    return results


def baselines_to_dataframe(baselines: dict[str, list[BaselinePoint]]) -> pd.DataFrame:
    """Convert baseline results to a single flat DataFrame for easy analysis."""
    rows = []
    for metric, points in baselines.items():
        for pt in points:
            rows.append(asdict(pt))
    return pd.DataFrame(rows)


def save_baseline_state(baselines: dict[str, list[BaselinePoint]], path: Optional[Path] = None):
    """Persist baseline state as JSON for downstream agents."""
    out_path = path or DATA_DIR / "baseline_state.json"
    payload = {}
    for metric, points in baselines.items():
        payload[metric] = [asdict(pt) for pt in points]
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2, default=str)
    print(f"  Saved baseline state → {out_path}")
    return out_path


def get_current_baseline(baselines: dict[str, list[BaselinePoint]], metric: str) -> dict:
    """Get the most recent valid baseline for a metric (for API consumption)."""
    points = baselines.get(metric, [])
    for pt in reversed(points):
        if pt.is_valid:
            return asdict(pt)
    return {}


# ── Main ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Loading data...")
    data = load_all()
    df = data["daily"]
    print(f"  {len(df)} days, metrics: {data['metrics']}")

    print("\nComputing baselines...")
    baselines = compute_all_baselines(data)

    # Save
    save_baseline_state(baselines)

    # Also save travel events
    travel_path = DATA_DIR / "travel_events.json"
    with open(travel_path, "w") as f:
        json.dump(data["travel_events"], f, indent=2)
    print(f"  Saved travel events → {travel_path}")

    # Summary
    for metric, points in baselines.items():
        valid = [p for p in points if p.is_valid]
        setpoint = [p for p in valid if p.in_setpoint_mode]
        disruptions = [p for p in points if p.is_disruption]
        print(f"\n{'═'*50}")
        print(f"METRIC: {metric}")
        print(f"  Valid baseline days: {len(valid)} / {len(points)}")
        print(f"  Setpoint mode days: {len(setpoint)}")
        print(f"  Disruption-flagged days: {len(disruptions)}")
        if valid:
            last = valid[-1]
            print(f"  Latest baseline: mean={last.baseline_mean}, std={last.baseline_std}")
            print(f"  Latest CI_95: [{last.ci_95_lower}, {last.ci_95_upper}]")
            print(f"  Latest actual: {last.actual_value}")
            print(f"  Setpoint mode: {last.in_setpoint_mode}")
