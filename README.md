# Lola Monorepo (Frontend + Orchestrated Backend + Baseline API)

This single repo contains:

- Expo frontend app (existing UI, unchanged)
- LOLA multi-agent orchestration backend from `lola/server`
- `lola-api` baseline/drift FastAPI service from `lola-api`
- mock/demo data and generated artifacts used for backend testing

## Repo Layout

- `src/`, `App.js`, Expo config: frontend
- `server/`: Node backend + 4-agent orchestration + mock health input
- `lola-api/`: Python baseline/drift API + baseline/demo data + chart scripts/assets

## What Runs Where

- Frontend: Expo app from repo root
- Orchestrated backend: Node process on `LOLA_BACKEND_PORT` (default `8787`)
- Baseline API: Python FastAPI process on `8000`

## Quick Start (Demo Mode, No Lobster/MCP Required)

1. Install frontend/backend Node deps:

```bash
npm install
```

2. Optional env file:

```bash
cp .env.example .env.local
```

3. Start backend (mock chat + orchestration):

```bash
npm run dev:backend
```

4. Run orchestrated demo directly:

```bash
npm run analysis:orchestrated
```

5. Start frontend:

```bash
npm run start
```

## Run Baseline API (`lola-api`)

Setup Python env and dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r lola-api/requirements.txt
```

Start API:

```bash
npm run dev:baseline-api
# equivalent:
# python3 -m uvicorn api:app --reload --host 127.0.0.1 --port 8000 --app-dir lola-api
```

Useful checks:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/metrics`

## Run Orchestrated Backend Demo

Primary demo command:

```bash
npm run analysis:orchestrated
```

HTTP endpoints on backend:

- `GET /api/health`
- `GET /api/analysis/mock`
- `GET /api/analysis/orchestrated`
- `POST /api/chat`

## Mock/Degraded Behavior (No Lobster, No Betterness/MCP)

- Default chat mode is `LOLA_CHAT_MODE=mock` (see `.env.example`).
- `POST /api/chat` works without Lobster by using orchestrator-backed mock responses.
- If `LOLA_CHAT_MODE=lobster` and Lobster fails/unavailable, backend falls back to mock chat.
- Orchestrator (`analysis:orchestrated`) runs without baseline API and returns explicit degraded metadata:
  - `degraded_mode: true`
  - `degraded_reason: ...`
- Baseline comparison pipeline (`analysis:mock`) expects baseline API availability and can fail fast if API is down.
- Betterness/MCP ingestion exists only as optional API endpoints in `lola-api`; not required for demo handoff.

## Included Demo/Baseline Files

Under `lola-api/`:

- `api.py`
- `data_loader.py`
- `baseline_calculator.py`
- `drift_detector.py`
- `demo_viz.py`
- `baseline_state.json`
- `drift_events.json`
- `travel_events.json`
- `manual_logs.json`
- `pht_data.xlsx`
- `charts/*.png`

Under `server/`:

- `mock/mockRecentHealth.json`
- 4-agent orchestration modules in `server/agents/`
- comparison/normalization/provider modules

## Notes

- Frontend has been kept intact.
- This repo is demo/backend-testing focused and intentionally avoids requiring Lobster or MCP setup for basic operation.
