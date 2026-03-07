# lola-api (Baseline Service)

Python FastAPI service copied from `/home/jm/my-project/lola-api`.

## Included

- `api.py` baseline/drift API endpoints
- `data_loader.py`, `baseline_calculator.py`, `drift_detector.py`
- `demo_viz.py` chart generation script
- baseline/demo data files:
  - `pht_data.xlsx`
  - `baseline_state.json`
  - `drift_events.json`
  - `travel_events.json`
  - `manual_logs.json`
- chart assets under `charts/`

## Run

From repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r lola-api/requirements.txt
npm run dev:baseline-api
```

Direct command without npm script:

```bash
python3 -m uvicorn api:app --reload --host 127.0.0.1 --port 8000 --app-dir lola-api
```

## Useful endpoints

- `GET /` health/status
- `GET /metrics`
- `GET /baseline/{metric}`
- `GET /trajectory/{metric}`
- `GET /drift/recent`
- `GET /drift/summary`
- `GET /charts`

## Regenerate charts

```bash
python3 lola-api/demo_viz.py
```
