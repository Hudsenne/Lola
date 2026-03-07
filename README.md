# Lola (Expo Frontend + Backend MVP)

This repository now contains both:
- Expo frontend app (existing mobile/web UI)
- Backend analysis/orchestration logic under `server/`

## Backend Summary

The backend is an MVP multi-agent pipeline for recent-health interpretation:
- `Data Steward` ingests mock recent data, normalizes it, fetches baseline from `lola-api`, and compares against baseline.
- `Clinical Reasoning Agent` builds a structured hypothesis and confidence score.
- `Behaviour Change Agent` generates low-friction prompt cards.
- `LOLA Orchestrator` applies routing/guardrails (confidence gating, escalation threshold, data freshness rules) and returns surfaced output.

Included backend modules:
- Baseline adapter: `server/providers/lolaBaseline.mjs`
- Recent data normalization: `server/normalize/recentHealth.mjs`
- Compare against baseline: `server/compare/againstBaseline.mjs`
- Mock recent health data: `server/mock/mockRecentHealth.json`
- Orchestrated demo runner: `server/runOrchestratedDemo.mjs`

See also:
- `server/LOLA_MULTI_AGENT_BACKEND.md`
- `server/HEALTH_COMPARISON_PIPELINE.md`

## Frontend/Backend Relationship

- Frontend remains the existing Expo app and scripts are unchanged (`start`, `android`, `ios`, `web`).
- Backend runs as a separate local Node process in this same repo (`server/chat-server.mjs`).
- Frontend can call backend endpoints when you point it to the backend host/port.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Optional: copy env template and edit values:

```bash
cp .env.example .env.local
```

## Run Backend From This Repo

### Orchestrated demo (primary)

```bash
node server/runOrchestratedDemo.mjs
# or
npm run analysis:orchestrated
```

### Baseline comparison demo

```bash
node server/runMockComparison.mjs
# or
npm run analysis:mock
```

### Backend API server

```bash
npm run dev:backend
```

Endpoints:
- `GET /api/health`
- `GET /api/analysis/mock`
- `GET /api/analysis/orchestrated`
- `POST /api/chat`

## Running With `lola-api`

Default backend expectation:
- `LOLA_API_BASE_URL=http://127.0.0.1:8000`

Typical local flow:
1. Start `lola-api` (separate repo/process).
2. Start backend here: `npm run dev:backend`.
3. Run demo or call backend endpoints.

Behavior by availability:
- If `lola-api` is available: baseline-backed comparison is used.
- If `lola-api` is unavailable:
  - Orchestrated flow continues in explicit degraded mode (`degraded_mode: true`, with reason).
  - Mock comparison pipeline may fail fast with a baseline fetch error.

## MVP Scope

This backend is a scaffold/MVP and not a production clinical decision system.
It currently uses mock recent data and simplified policy logic, with clear degraded fallback behavior.
