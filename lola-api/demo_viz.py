"""
LOLA Engine — Module 3: Demo Visualization

Clean, judge-ready charts per metric:
- Shaded baseline band (mean ± 1σ, mean ± 2σ)
- Metric value line
- Drift event markers (yellow=warning, red=alert)
- Context labels on markers
- Confidence scores on alerts
"""

import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import FancyBboxPatch
from pathlib import Path
from dataclasses import asdict

from data_loader import load_all, DATA_DIR
from baseline_calculator import compute_all_baselines, BaselinePoint, save_baseline_state
from drift_detector import detect_drift_events, save_drift_events, DriftEvent

# ── Style ────────────────────────────────────────────────────────

COLORS = {
    "bg": "#0D1117",
    "panel": "#161B22",
    "text": "#E6EDF3",
    "text_dim": "#8B949E",
    "line": "#58A6FF",
    "baseline": "#58A6FF",
    "band_1s": "#58A6FF",
    "band_2s": "#58A6FF",
    "warning": "#D29922",
    "alert": "#F85149",
    "travel": "#A371F7",
    "holiday": "#F0883E",
    "summer": "#3FB950",
    "autumn": "#DB6D28",
    "grid": "#21262D",
    "setpoint": "#388BFD",
}

CONTEXT_COLORS = {
    "Travel Disruption": COLORS["travel"],
    "Holiday Drift": COLORS["holiday"],
    "Holiday Recovery": COLORS["holiday"],
    "Summer Drift": COLORS["summer"],
    "Autumn Creep": COLORS["autumn"],
    "Unexplained Drift": COLORS["alert"],
}

METRIC_LABELS = {
    "weight_kg": "Weight (kg)",
    "calories": "Calories (kcal)",
    "steps": "Steps",
}


def plot_metric(
    baselines: list[BaselinePoint],
    events: list[DriftEvent],
    metric: str,
    output_dir: Path | None = None,
    show: bool = False,
) -> Path:
    """Generate a single demo chart for one metric."""
    out_dir = output_dir or DATA_DIR / "charts"
    out_dir.mkdir(exist_ok=True)

    # Parse baseline data
    dates = []
    means = []
    stds = []
    actuals = []
    actual_dates = []
    setpoint_dates = []
    setpoint_vals = []
    travel_dates = []
    travel_vals = []

    for pt in baselines:
        d = pd.Timestamp(pt.date)
        if not pt.is_valid:
            continue
        dates.append(d)
        means.append(pt.baseline_mean)
        stds.append(pt.baseline_std)

        if pt.actual_value is not None:
            actual_dates.append(d)
            actuals.append(pt.actual_value)

            if pt.in_setpoint_mode:
                setpoint_dates.append(d)
                setpoint_vals.append(pt.actual_value)

            if pt.is_travel:
                travel_dates.append(d)
                travel_vals.append(pt.actual_value)

    dates = np.array(dates)
    means = np.array(means)
    stds = np.array(stds)

    # ── Figure setup ──
    fig, ax = plt.subplots(figsize=(18, 7), facecolor=COLORS["bg"])
    ax.set_facecolor(COLORS["panel"])

    # ── Baseline bands ──
    ax.fill_between(
        dates, means - 2 * stds, means + 2 * stds,
        alpha=0.08, color=COLORS["band_2s"], label="±2σ band", linewidth=0,
    )
    ax.fill_between(
        dates, means - stds, means + stds,
        alpha=0.15, color=COLORS["band_1s"], label="±1σ band", linewidth=0,
    )

    # ── Baseline mean line ──
    ax.plot(dates, means, color=COLORS["baseline"], alpha=0.5, linewidth=1,
            linestyle="--", label="Baseline mean")

    # ── Actual values line ──
    ax.plot(actual_dates, actuals, color=COLORS["line"], linewidth=1.5,
            alpha=0.9, label="Actual", zorder=3)

    # ── Travel day markers (small dots) ──
    if travel_dates:
        ax.scatter(travel_dates, travel_vals, color=COLORS["travel"],
                   s=12, alpha=0.6, zorder=4, label="Travel day")

    # ── Drift event markers ──
    alert_events = [e for e in events if e.severity == "alert"]
    warning_events = [e for e in events if e.severity == "warning"]

    # Warnings: small markers
    for e in warning_events:
        peak_d = pd.Timestamp(e.peak_date)
        color = CONTEXT_COLORS.get(e.context_label, COLORS["warning"])
        ax.scatter([peak_d], [e.peak_value], color=color, s=40, alpha=0.7,
                   zorder=5, edgecolors="white", linewidths=0.3)

    # Alerts: larger markers with labels
    label_positions = []  # track for collision avoidance
    for e in alert_events:
        peak_d = pd.Timestamp(e.peak_date)
        color = CONTEXT_COLORS.get(e.context_label, COLORS["alert"])

        # Highlight span
        start_d = pd.Timestamp(e.start_date)
        end_d = pd.Timestamp(e.end_date)
        ax.axvspan(start_d, end_d, alpha=0.06, color=color, zorder=1)

        # Peak marker
        ax.scatter([peak_d], [e.peak_value], color=color, s=80, alpha=0.9,
                   zorder=6, edgecolors="white", linewidths=0.8, marker="D")

        # Label: context + sigma + confidence
        label_text = f"{e.context_label}\n{e.deviation_sigma:.1f}σ · {e.confidence:.0%}"

        # Simple vertical offset to avoid overlaps
        y_offset = 15 if e.direction == "up" else -25
        for prev_d, prev_y in label_positions:
            if abs((peak_d - prev_d).days) < 20:
                y_offset = -y_offset  # flip if too close

        ax.annotate(
            label_text,
            xy=(peak_d, e.peak_value),
            xytext=(0, y_offset),
            textcoords="offset points",
            fontsize=7,
            color=color,
            alpha=0.9,
            ha="center",
            va="bottom" if y_offset > 0 else "top",
            fontweight="bold",
            bbox=dict(boxstyle="round,pad=0.3", facecolor=COLORS["bg"],
                      edgecolor=color, alpha=0.8, linewidth=0.5),
            arrowprops=dict(arrowstyle="-", color=color, alpha=0.4, lw=0.5),
            zorder=7,
        )
        label_positions.append((peak_d, y_offset))

    # ── Axes styling ──
    metric_label = METRIC_LABELS.get(metric, metric)
    ax.set_title(
        f"LOLA · {metric_label} — Personal Baseline & Drift Detection",
        fontsize=14, fontweight="bold", color=COLORS["text"], pad=15,
    )
    ax.set_xlabel("Date", fontsize=10, color=COLORS["text_dim"])
    ax.set_ylabel(metric_label, fontsize=10, color=COLORS["text_dim"])

    ax.tick_params(colors=COLORS["text_dim"], labelsize=9)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
    plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha="right")

    ax.grid(True, alpha=0.15, color=COLORS["grid"], linewidth=0.5)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_color(COLORS["grid"])
    ax.spines["left"].set_color(COLORS["grid"])

    # ── Legend ──
    legend = ax.legend(
        loc="upper right", fontsize=8, framealpha=0.8,
        facecolor=COLORS["panel"], edgecolor=COLORS["grid"],
        labelcolor=COLORS["text_dim"],
    )

    # ── Stats box ──
    n_alerts = len(alert_events)
    n_warnings = len(warning_events)
    n_travel = sum(1 for e in events if e.is_travel)
    stats_text = (
        f"Alerts: {n_alerts}  |  Warnings: {n_warnings}  |  Travel-triggered: {n_travel}\n"
        f"Baseline window: 90 days  |  Data points: {len(actuals)}"
    )
    ax.text(
        0.01, 0.97, stats_text, transform=ax.transAxes,
        fontsize=8, color=COLORS["text_dim"], verticalalignment="top",
        bbox=dict(boxstyle="round,pad=0.4", facecolor=COLORS["bg"],
                  edgecolor=COLORS["grid"], alpha=0.8),
    )

    plt.tight_layout()

    # ── Save ──
    out_path = out_dir / f"lola_{metric}.png"
    fig.savefig(out_path, dpi=150, facecolor=COLORS["bg"],
                bbox_inches="tight", pad_inches=0.3)
    if show:
        plt.show()
    plt.close(fig)
    print(f"  Saved chart → {out_path}")
    return out_path


def plot_travel_focus(
    baselines: list[BaselinePoint],
    events: list[DriftEvent],
    output_dir: Path | None = None,
) -> Path:
    """
    Focused chart: weight drift around travel events only.
    This is the hackathon demo chart for Jayden's scenario.
    """
    out_dir = output_dir or DATA_DIR / "charts"
    out_dir.mkdir(exist_ok=True)

    travel_events = [e for e in events if e.is_travel and e.metric == "weight_kg"]

    # Get baseline data
    dates, means, stds, actual_dates, actuals = [], [], [], [], []
    for pt in baselines:
        if not pt.is_valid:
            continue
        d = pd.Timestamp(pt.date)
        dates.append(d)
        means.append(pt.baseline_mean)
        stds.append(pt.baseline_std)
        if pt.actual_value is not None:
            actual_dates.append(d)
            actuals.append(pt.actual_value)

    dates = np.array(dates)
    means = np.array(means)
    stds = np.array(stds)

    fig, ax = plt.subplots(figsize=(18, 7), facecolor=COLORS["bg"])
    ax.set_facecolor(COLORS["panel"])

    # Bands
    ax.fill_between(dates, means - 2 * stds, means + 2 * stds,
                     alpha=0.08, color=COLORS["band_2s"], linewidth=0)
    ax.fill_between(dates, means - stds, means + stds,
                     alpha=0.15, color=COLORS["band_1s"], linewidth=0)
    ax.plot(dates, means, color=COLORS["baseline"], alpha=0.4, linewidth=1, linestyle="--")
    ax.plot(actual_dates, actuals, color=COLORS["line"], linewidth=1.5, alpha=0.9, zorder=3)

    # Highlight each travel drift event
    for e in travel_events:
        start_d = pd.Timestamp(e.start_date)
        end_d = pd.Timestamp(e.end_date)
        peak_d = pd.Timestamp(e.peak_date)

        ax.axvspan(start_d, end_d, alpha=0.12, color=COLORS["travel"], zorder=1)
        ax.scatter([peak_d], [e.peak_value], color=COLORS["travel"], s=80,
                   alpha=0.9, zorder=6, edgecolors="white", linewidths=0.8, marker="D")

        severity_icon = "!" if e.severity == "alert" else "~"
        label = f"{severity_icon} {e.deviation_sigma:.1f}σ · {e.duration_days}d"
        y_off = 18 if e.direction == "up" else -22
        ax.annotate(
            label, xy=(peak_d, e.peak_value), xytext=(0, y_off),
            textcoords="offset points", fontsize=7.5, color=COLORS["travel"],
            ha="center", fontweight="bold",
            bbox=dict(boxstyle="round,pad=0.3", facecolor=COLORS["bg"],
                      edgecolor=COLORS["travel"], alpha=0.85, linewidth=0.5),
            arrowprops=dict(arrowstyle="-", color=COLORS["travel"], alpha=0.4, lw=0.5),
            zorder=7,
        )

    ax.set_title(
        "LOLA · Travel Disruption — Weight Drift Detection",
        fontsize=14, fontweight="bold", color=COLORS["text"], pad=15,
    )
    ax.set_xlabel("Date", fontsize=10, color=COLORS["text_dim"])
    ax.set_ylabel("Weight (kg)", fontsize=10, color=COLORS["text_dim"])
    ax.tick_params(colors=COLORS["text_dim"], labelsize=9)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
    plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha="right")
    ax.grid(True, alpha=0.15, color=COLORS["grid"], linewidth=0.5)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_color(COLORS["grid"])
    ax.spines["left"].set_color(COLORS["grid"])

    stats = f"Travel weight drift events: {len(travel_events)}  |  Total travel weeks: 45"
    ax.text(0.01, 0.97, stats, transform=ax.transAxes, fontsize=8,
            color=COLORS["text_dim"], va="top",
            bbox=dict(boxstyle="round,pad=0.4", facecolor=COLORS["bg"],
                      edgecolor=COLORS["grid"], alpha=0.8))

    plt.tight_layout()
    out_path = out_dir / "lola_travel_focus.png"
    fig.savefig(out_path, dpi=150, facecolor=COLORS["bg"],
                bbox_inches="tight", pad_inches=0.3)
    plt.close(fig)
    print(f"  Saved travel focus chart → {out_path}")
    return out_path


# ── Main ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Loading data...")
    data = load_all()

    print("Computing baselines...")
    baselines = compute_all_baselines(data)
    save_baseline_state(baselines)

    print("Detecting drift...")
    events = detect_drift_events(baselines)
    save_drift_events(events)

    print("\nGenerating charts...")
    for metric in data["metrics"]:
        metric_events = [e for e in events if e.metric == metric]
        plot_metric(baselines[metric], metric_events, metric)

    # Travel focus chart (for Jayden's demo)
    plot_travel_focus(baselines["weight_kg"], events)

    print("\nDone. Charts saved to ./charts/")
