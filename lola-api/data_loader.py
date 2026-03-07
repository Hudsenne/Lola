"""
LOLA Engine — Data Loader
Loads PHT.life xlsx data, cleans schema, extracts travel events,
joins weekly subjective scores onto daily timeline.
"""

import pandas as pd
import numpy as np
import re
import json
from pathlib import Path
from datetime import timedelta

DATA_DIR = Path(__file__).parent
XLSX_PATH = DATA_DIR / "pht_data.xlsx"


# ── Column mappings ──────────────────────────────────────────────

DAILY_COLS = {
    "Дата отчета": "date",
    "Вес": "weight_kg",
    "Калории": "calories",
    "Шаги": "steps",
    "Количество тренировок": "workout_count",
    "Я не взвешивался": "skipped_weigh",
    "Я не считал(а) ккал": "skipped_cal",
    "Другие весы": "other_scales",
}

WEEKLY_COLS = {
    "Дата создания": "week_date",
    "% жира": "body_fat_pct",
    "Средний вес": "avg_weight",
    "Минимальный вес": "min_weight",
    "Обхват шеи": "neck_cm",
    "Обхват талии": "waist_cm",
    "Обхват бёдер": "hip_cm",
    "Среднее количество шагов в день за прошедшую неделю": "avg_steps_weekly",
    "голод": "hunger",
    "энергия": "energy",
    "Питание": "nutrition_score",
    "Качество сна": "sleep_quality",
    "Стресс": "stress",
    "комментарий": "comment",
}

# ── Seasonal windows ─────────────────────────────────────────────

SEASONAL_WINDOWS = {
    "holiday_window": [(11, 15), (1, 15)],   # Nov 15 – Jan 15
    "summer_window": [(6, 1), (8, 31)],       # Jun 1 – Aug 31
    "autumn_window": [(10, 1), (11, 14)],     # Oct 1 – Nov 14
}


def _in_seasonal_window(date, window_name: str) -> bool:
    """Check if a date falls within a named seasonal window."""
    bounds = SEASONAL_WINDOWS[window_name]
    m, d = date.month, date.day
    if window_name == "holiday_window":
        # Wraps around year boundary: Nov 15 – Jan 15
        return (m == 11 and d >= 15) or m == 12 or (m == 1 and d <= 15)
    else:
        start_m, start_d = bounds[0]
        end_m, end_d = bounds[1]
        start = start_m * 100 + start_d
        end = end_m * 100 + end_d
        current = m * 100 + d
        return start <= current <= end


def tag_seasons(df: pd.DataFrame) -> pd.DataFrame:
    """Add seasonal context columns to a daily DataFrame."""
    for window_name in SEASONAL_WINDOWS:
        df[window_name] = df["date"].apply(lambda d: _in_seasonal_window(d, window_name))
    # Composite label
    def _label(row):
        if row["holiday_window"]:
            return "Holiday"
        if row["summer_window"]:
            return "Summer"
        if row["autumn_window"]:
            return "Autumn"
        return "Normal"
    df["season_label"] = df.apply(_label, axis=1)
    return df


# ── Travel event extraction ──────────────────────────────────────

# Keywords that indicate travel IS happening (positive)
TRAVEL_POS = [
    r"в командировк",
    r"командировк[аие]",
    r"поездк",
    r"перелет",
    r"в дорог[еу]",
    r"в штат[ыа]",
    r"в сша",
    r"ближн.*восток",
    r"джэт.?лаг",
    r"jet.?lag",
    r"разниц.*во времени",
    r"часов.*разниц",
    r"отпуск",
    r"был в.*стран",
    r"4 стран",
]

# Keywords that negate travel (false positives)
TRAVEL_NEG = [
    r"без командировок",
    r"не было командировок",
    r"не предвидится командировок",
    r"возврат.*из командировк",
    r"завершились командировк",
    r"после командировк",
    r"восстанавливал.*после",
]


def _is_travel_week(comment: str) -> bool:
    """Determine if a weekly comment indicates active travel that week."""
    if not comment or pd.isna(comment):
        return False
    c = comment.lower()
    # Check negations first
    for neg in TRAVEL_NEG:
        if re.search(neg, c):
            return False
    # Check positive matches
    for pos in TRAVEL_POS:
        if re.search(pos, c):
            return True
    return False


def extract_travel_events(weekly_df: pd.DataFrame) -> list[dict]:
    """Extract travel event records from weekly comments."""
    events = []
    for _, row in weekly_df.iterrows():
        comment = row.get("comment", "")
        if _is_travel_week(comment):
            week_date = pd.to_datetime(str(row["week_date"])[:10])
            # Travel week covers the 7 days ending on the report date
            events.append({
                "week_end_date": week_date.isoformat()[:10],
                "week_start_date": (week_date - timedelta(days=6)).isoformat()[:10],
                "comment_snippet": str(comment)[:200],
            })
    return events


def build_travel_day_flags(travel_events: list[dict], dates: pd.Series) -> np.ndarray:
    """Create a boolean array flagging each day as travel or not."""
    travel_days = set()
    for evt in travel_events:
        start = pd.Timestamp(evt["week_start_date"])
        end = pd.Timestamp(evt["week_end_date"])
        current = start
        while current <= end:
            travel_days.add(current.normalize())
            current += timedelta(days=1)
    return np.array([d.normalize() in travel_days for d in dates])


# ── Weekly subjective scores → daily join ────────────────────────

SUBJECTIVE_COLS = ["hunger", "energy", "nutrition_score", "sleep_quality", "stress"]


def join_weekly_to_daily(daily_df: pd.DataFrame, weekly_df: pd.DataFrame) -> pd.DataFrame:
    """Forward-fill weekly subjective scores onto daily rows."""
    weekly_sub = weekly_df[["week_date"] + SUBJECTIVE_COLS].copy()
    weekly_sub["week_date"] = pd.to_datetime(weekly_sub["week_date"].astype(str).str[:10])
    weekly_sub = weekly_sub.sort_values("week_date").drop_duplicates(subset=["week_date"])

    daily_df = daily_df.sort_values("date")
    merged = pd.merge_asof(
        daily_df,
        weekly_sub.rename(columns={"week_date": "date"}),
        on="date",
        direction="backward",
        suffixes=("", "_weekly"),
    )
    return merged


# ── Main loader ──────────────────────────────────────────────────

def load_daily(xlsx_path: str | Path | None = None) -> pd.DataFrame:
    """Load and clean daily report data from PHT xlsx."""
    path = Path(xlsx_path) if xlsx_path else XLSX_PATH
    raw = pd.read_excel(path, sheet_name="Ежедневные отчёты")

    # Rename columns, drop cohort
    df = raw.rename(columns=DAILY_COLS)
    df = df.drop(columns=["Поток", "Цикл"], errors="ignore")

    # Parse & sort dates
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    # Fill inter-cohort gaps with NaN rows to maintain continuous timeline
    full_range = pd.date_range(df["date"].min(), df["date"].max(), freq="D")
    df = df.set_index("date").reindex(full_range).rename_axis("date").reset_index()

    # Ensure boolean columns survive reindex
    for bcol in ["skipped_weigh", "skipped_cal", "other_scales"]:
        if bcol in df.columns:
            df[bcol] = df[bcol].fillna(False).infer_objects(copy=False).astype(bool)

    # Tag seasons
    df = tag_seasons(df)

    return df


def load_weekly(xlsx_path: str | Path | None = None) -> pd.DataFrame:
    """Load and clean weekly report data."""
    path = Path(xlsx_path) if xlsx_path else XLSX_PATH
    raw = pd.read_excel(path, sheet_name="Еженедельные отчёты")
    df = raw.rename(columns=WEEKLY_COLS)
    df = df.drop(columns=["Поток", "цикл"], errors="ignore")
    df["week_date"] = pd.to_datetime(df["week_date"].astype(str).str[:10])
    df = df.sort_values("week_date").reset_index(drop=True)
    return df


def load_all(xlsx_path: str | Path | None = None) -> dict:
    """
    Master loader. Returns:
      {
        "daily": pd.DataFrame — clean daily timeline with seasons + travel flags + weekly scores,
        "weekly": pd.DataFrame — clean weekly reports,
        "travel_events": list[dict] — extracted travel event records,
        "metrics": list[str] — available numeric metric column names,
      }
    """
    daily = load_daily(xlsx_path)
    weekly = load_weekly(xlsx_path)

    # Extract travel events & flag daily rows
    travel_events = extract_travel_events(weekly)
    daily["is_travel"] = build_travel_day_flags(travel_events, daily["date"])

    # Join weekly subjective scores
    daily = join_weekly_to_daily(daily, weekly)

    # Identify available numeric metrics
    numeric_cols = daily.select_dtypes(include=[np.number]).columns.tolist()
    exclude = {"workout_count", "hunger", "energy", "nutrition_score", "sleep_quality", "stress"}
    metrics = [c for c in numeric_cols if c not in exclude]

    return {
        "daily": daily,
        "weekly": weekly,
        "travel_events": travel_events,
        "metrics": metrics,
    }


if __name__ == "__main__":
    data = load_all()
    df = data["daily"]
    print(f"Daily timeline: {len(df)} days, {df['date'].min().date()} → {df['date'].max().date()}")
    print(f"Metrics: {data['metrics']}")
    print(f"Travel events extracted: {len(data['travel_events'])}")
    print(f"\nColumns: {list(df.columns)}")
    print(f"\nSeason distribution:\n{df['season_label'].value_counts()}")
    print(f"\nTravel days: {df['is_travel'].sum()}")
    print(f"\nSample (first 5):")
    print(df.head().to_string())
    print(f"\nNull counts:")
    print(df.isnull().sum().to_string())
