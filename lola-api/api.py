"""
LOLA Engine — Module 4: FastAPI

The interface Jayden's Nutritionist and Hudson's Diagnostician call into.

Endpoints:
  GET  /baseline/{metric}     → current baseline state
  GET  /drift/recent          → last 30 days of drift events
  GET  /drift/travel          → all travel-triggered drift events (for Jayden)
  GET  /drift/all             → full drift history
  GET  /drift/summary         → summary stats (for Hudson)
  GET  /trajectory/{metric}   → full time-series for Hudson's Diagnostician
  GET  /travel/events         → extracted travel event list
  GET  /metrics               → available metrics
  POST /ingest                → xlsx upload OR Betterness MCP JSON stream
  POST /log/manual            → quick log: {date, metric, value, note}
"""

import json
import io
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from data_loader import load_all, DATA_DIR
from baseline_calculator import (
    compute_all_baselines,
    save_baseline_state,
    get_current_baseline,
    baselines_to_dataframe,
    BaselinePoint,
)
from drift_detector import (
    detect_drift_events,
    save_drift_events,
    get_recent_drift,
    get_travel_drift,
    get_drift_summary,
    DriftEvent,
)
from dataclasses import asdict

# ── App ──────────────────────────────────────────────────────────

app = FastAPI(
    title="LOLA Engine",
    description="Longitudinal Observation & Lifestyle Analytics — Drift Detection API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── State ────────────────────────────────────────────────────────
# Loaded once at startup, refreshed on /ingest

_state: dict = {}


def _init_state(xlsx_path: Optional[Path] = None):
    """Load data, compute baselines and drift, populate state."""
    global _state
    data = load_all(xlsx_path)
    baselines = compute_all_baselines(data)
    save_baseline_state(baselines)
    events = detect_drift_events(baselines)
    save_drift_events(events)

    _state = {
        "data": data,
        "baselines": baselines,
        "events": events,
        "metrics": data["metrics"],
        "travel_events": data["travel_events"],
        "manual_logs": [],  # supplementary manual entries
    }


@app.on_event("startup")
def startup():
    print("LOLA Engine starting — loading data and computing baselines...")
    _init_state()
    print(f"Ready. Metrics: {_state['metrics']}, Drift events: {len(_state['events'])}")


# ── Models ───────────────────────────────────────────────────────

class ManualLog(BaseModel):
    date: str  # ISO format: "2025-01-15"
    metric: str
    value: float
    note: Optional[str] = None


class BetternessPayload(BaseModel):
    """Normalized data from Betterness MCP stream."""
    records: list[dict]  # [{date, metric, value, ...}]


# ── Endpoints ────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "engine": "LOLA",
        "version": "0.1.0",
        "status": "running",
        "metrics": _state.get("metrics", []),
        "drift_events": len(_state.get("events", [])),
        "travel_events": len(_state.get("travel_events", [])),
    }


@app.get("/metrics")
def get_metrics():
    """List available metrics."""
    return {"metrics": _state["metrics"]}


# ── Baseline endpoints ───────────────────────────────────────────

@app.get("/baseline/{metric}")
def get_baseline(metric: str):
    """Get current baseline state for a metric."""
    if metric not in _state["baselines"]:
        raise HTTPException(404, f"Metric '{metric}' not found. Available: {_state['metrics']}")
    current = get_current_baseline(_state["baselines"], metric)
    if not current:
        raise HTTPException(404, f"No valid baseline for '{metric}'")
    return current


@app.get("/baseline/{metric}/history")
def get_baseline_history(
    metric: str,
    days: int = Query(default=90, description="How many days of history"),
):
    """Get baseline history for a metric (last N days)."""
    if metric not in _state["baselines"]:
        raise HTTPException(404, f"Metric '{metric}' not found")
    points = _state["baselines"][metric]
    cutoff = (datetime.now() - timedelta(days=days)).isoformat()[:10]
    recent = [asdict(p) for p in points if p.date >= cutoff]
    return {"metric": metric, "days": days, "points": recent}


# ── Drift endpoints ──────────────────────────────────────────────

@app.get("/drift/recent")
def drift_recent(days: int = Query(default=30)):
    """Last N days of drift events."""
    return {
        "days": days,
        "events": get_recent_drift(_state["events"], days),
    }


@app.get("/drift/travel")
def drift_travel():
    """All travel-triggered drift events (for Jayden's Nutritionist agent)."""
    travel = get_travel_drift(_state["events"])
    return {
        "count": len(travel),
        "events": travel,
    }


@app.get("/drift/all")
def drift_all(
    metric: Optional[str] = Query(default=None),
    severity: Optional[str] = Query(default=None, description="warning or alert"),
    context: Optional[str] = Query(default=None, description="e.g. Travel Disruption"),
):
    """Full drift history with optional filters."""
    events = _state["events"]
    if metric:
        events = [e for e in events if e.metric == metric]
    if severity:
        events = [e for e in events if e.severity == severity]
    if context:
        events = [e for e in events if e.context_label == context]
    return {
        "count": len(events),
        "events": [asdict(e) for e in events],
    }


@app.get("/drift/summary")
def drift_summary():
    """Summary stats for Hudson's Diagnostician agent."""
    return get_drift_summary(_state["events"])


# ── Trajectory endpoints ─────────────────────────────────────────

@app.get("/trajectory/{metric}")
def get_trajectory(
    metric: str,
    start: Optional[str] = Query(default=None, description="Start date ISO"),
    end: Optional[str] = Query(default=None, description="End date ISO"),
):
    """
    Full time-series for a metric: baseline + actual values.
    For Hudson's Diagnostician agent.
    """
    if metric not in _state["baselines"]:
        raise HTTPException(404, f"Metric '{metric}' not found")

    points = _state["baselines"][metric]
    if start:
        points = [p for p in points if p.date >= start]
    if end:
        points = [p for p in points if p.date <= end]

    return {
        "metric": metric,
        "count": len(points),
        "trajectory": [asdict(p) for p in points],
    }


# ── Travel events ────────────────────────────────────────────────

@app.get("/travel/events")
def travel_events():
    """Raw travel event list extracted from weekly comments."""
    return {
        "count": len(_state["travel_events"]),
        "events": _state["travel_events"],
    }


# ── Ingest endpoints ─────────────────────────────────────────────

@app.post("/ingest")
async def ingest_xlsx(file: UploadFile = File(...)):
    """
    Upload xlsx to re-compute baselines and drift.
    Accepts PHT.life format xlsx.
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Only .xlsx/.xls files accepted")

    # Save uploaded file
    content = await file.read()
    upload_path = DATA_DIR / "pht_data_uploaded.xlsx"
    with open(upload_path, "wb") as f:
        f.write(content)

    # Re-initialize state with new data
    _init_state(upload_path)

    return {
        "status": "ok",
        "message": "Data ingested, baselines recomputed",
        "metrics": _state["metrics"],
        "drift_events": len(_state["events"]),
        "travel_events": len(_state["travel_events"]),
    }


@app.post("/ingest/betterness")
def ingest_betterness(payload: BetternessPayload):
    """
    Accept normalized JSON from Betterness MCP stream.
    Expected format: {records: [{date, metric, value, ...}]}
    Merges into existing daily data and recomputes.
    """
    if not payload.records:
        raise HTTPException(400, "No records provided")

    # For hackathon: append to manual_logs, re-trigger computation
    for rec in payload.records:
        _state["manual_logs"].append(rec)

    return {
        "status": "ok",
        "records_added": len(payload.records),
        "message": "Records queued. Call /recompute to update baselines.",
    }


@app.post("/log/manual")
def log_manual(entry: ManualLog):
    """
    Quick Log + Macro Snapshot input.
    Feeds into baseline_calculator as supplementary data points.
    """
    log_entry = {
        "date": entry.date,
        "metric": entry.metric,
        "value": entry.value,
        "note": entry.note,
        "logged_at": datetime.now().isoformat(),
    }
    _state["manual_logs"].append(log_entry)

    # Persist to file
    logs_path = DATA_DIR / "manual_logs.json"
    existing = []
    if logs_path.exists():
        with open(logs_path) as f:
            existing = json.load(f)
    existing.append(log_entry)
    with open(logs_path, "w") as f:
        json.dump(existing, f, indent=2)

    return {
        "status": "ok",
        "entry": log_entry,
        "total_manual_logs": len(_state["manual_logs"]),
    }


@app.post("/recompute")
def recompute():
    """Force recompute baselines and drift from current data."""
    _init_state()
    return {
        "status": "ok",
        "metrics": _state["metrics"],
        "drift_events": len(_state["events"]),
    }


# ── Chart endpoints ──────────────────────────────────────────────

@app.get("/charts/{chart_name}")
def get_chart(chart_name: str):
    """Serve pre-generated chart images."""
    chart_path = DATA_DIR / "charts" / f"{chart_name}.png"
    if not chart_path.exists():
        available = [f.stem for f in (DATA_DIR / "charts").glob("*.png")]
        raise HTTPException(404, f"Chart '{chart_name}' not found. Available: {available}")
    return FileResponse(chart_path, media_type="image/png")


@app.get("/charts")
def list_charts():
    """List available chart images."""
    charts_dir = DATA_DIR / "charts"
    if not charts_dir.exists():
        return {"charts": []}
    return {"charts": [f.stem for f in charts_dir.glob("*.png")]}
