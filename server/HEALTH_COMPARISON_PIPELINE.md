# LOLA Backend Health Comparison Pipeline (MVP)

For the newer multi-agent backend scaffold (orchestrator + subagents), see:

- `server/LOLA_MULTI_AGENT_BACKEND.md`

This pipeline is backend-only and frontend-agnostic.

## Product framing

- Baseline data from `lola-api` is a reference frame.
- Recent incoming data is normalized first.
- Recent data is compared against baseline before any synthesis.
- The output is an interpreted comparison context for Lobster.
- Raw baseline and recent daily data are not merged as equivalent records.

## Modules

- `server/normalize/recentHealth.mjs`
- `server/providers/lolaBaseline.mjs`
- `server/compare/againstBaseline.mjs`
- `server/analyze/buildAnalysisContext.mjs`
- `server/analyze/runMockComparisonPipeline.mjs`
- `server/mock/mockRecentHealth.json`

## Canonical normalized schema (recent data)

`normalizeRecentHealth` returns:

```json
{
  "schema_version": "recent-health.v1",
  "source": "betterness-mock",
  "user_id": "demo-user-001",
  "captured_at": "2026-03-07T08:15:00Z",
  "metric_fields": [
    "sleep_duration_hours",
    "sleep_efficiency",
    "hrv_ms",
    "resting_hr_bpm",
    "steps",
    "active_energy_kcal",
    "weight_kg"
  ],
  "daily_snapshots": [
    {
      "date": "2026-03-07",
      "sleep_duration_hours": 7.13,
      "sleep_efficiency": 0.89,
      "hrv_ms": 50,
      "resting_hr_bpm": 58,
      "steps": 9560,
      "active_energy_kcal": 515,
      "weight_kg": 77.02
    }
  ],
  "recent_summary": {
    "days_observed": 7,
    "start_date": "2026-03-01",
    "end_date": "2026-03-07",
    "metric_means": {
      "sleep_duration_hours": 7.19,
      "sleep_efficiency": 0.893,
      "hrv_ms": 51.143,
      "resting_hr_bpm": 58,
      "steps": 9538.571,
      "active_energy_kcal": 509.571,
      "weight_kg": 77.53
    }
  }
}
```

## Baseline adapter

`fetchLolaBaseline` calls `lola-api` endpoints:

- `GET /metrics` (or `/api/metrics`)
- `GET /trajectory` (or `/api/trajectory`)
- `GET /baseline` (or `/api/baseline`)

Environment:

- `LOLA_API_BASE_URL` default: `http://127.0.0.1:8000`
- `LOLA_API_TIMEOUT_MS` default: `5000`

If any required endpoint is unavailable, pipeline fails with clear error text.

## Comparison outputs

`compareAgainstBaseline` computes per metric:

- `delta` vs baseline mean
- `percent_delta` (when baseline mean is non-zero)
- `z_score` (when baseline std exists and > 0)
- `drift_label` in: `within_baseline`, `moderate_drift`, `significant_drift`, `insufficient_baseline`

It also emits simple drift flags with severity.

## Analysis context for Lobster

`buildAnalysisContext` returns:

- `question`
- `baseline_reference`
- `recent_summary`
- `comparisons`
- `flags`
- `supporting_daily_snapshots`

## Run locally

Script:

```bash
npm run analysis:mock
npm run analysis:orchestrated
```

Optional question override:

```bash
node server/runMockComparison.mjs "What changed this week?"
```

Backend endpoint:

- `GET /api/analysis/mock`
- `GET /api/analysis/mock?question=What+changed+this+week%3F`
- `GET /api/analysis/orchestrated`
- `GET /api/analysis/orchestrated?question=What+changed+this+week%3F`

Success returns structured JSON analysis context.

Failure returns `503` with message and hint to start/configure `lola-api`.
