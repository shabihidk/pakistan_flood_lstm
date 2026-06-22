# Deployment — Flood_LSTMV4 + Supabase

National 163-district 7-day flood-risk dashboard.

## Architecture

```
Supabase (admin_units, daily_features, static_features, lstm_predictions)
    ↑ read (frontend anon key)     ↑ read/write (backend service role)
Frontend (Vite/React)              Backend (Flask + inference_v4.py)
    district map + risk panel      batch inference + API proxy
```

**Vercel:** serves the built frontend and a **read-only Supabase API proxy** (`api/index.py`). Live LSTM inference runs on a separate host with PyTorch (local machine, VM, DGX, etc.).

## Environment

## Environment security

| Variable | Where | Notes |
|----------|--------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Backend / inference host only | Bypasses RLS — never use in frontend or `VITE_*` vars |
| `VITE_SUPABASE_ANON_KEY` | Frontend only | RLS-protected public key |
| `VITE_API_BASE_URL` | Frontend | Defaults to `/api` (Flask proxy in dev) |

Copy `.env.example` → `.env` and `frontend/.env.example` → `frontend/.env`. **Never commit** filled `.env` files.

The app validates env naming at startup (blocks `VITE_*SERVICE_ROLE*` on the server; blocks secret-like `VITE_*` names in the browser bundle).

### Backend / inference host (root `.env`)

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
MODEL_DIR=./models/flood_lstm_v4
MODEL_VERSION=Flood_LSTMV4
FLASK_DEBUG=false
```

### Frontend (`frontend/.env`)

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=/api
```

On Vercel, set the `VITE_*` variables in the project dashboard. For local dev, leave `VITE_API_BASE_URL=/api` to proxy through Vite to Flask on port 5000.

### Vercel serverless (project env)

Same Supabase vars as backend (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Inference routes return 503 on Vercel by design.

## Setup checklist

1. Copy Colab artifacts into `models/flood_lstm_v4/` and run `python scripts/validate_artifacts.py`
2. Enable Supabase **SELECT** on `admin_units`, `lstm_predictions`, `daily_features`, `static_features` for the anon key (or use API proxy only)
3. `pip install -r requirements.txt` on the inference host
4. `cd frontend && npm ci && npm run build`
5. Deploy to Vercel (uses `vercel.json` + `api/requirements.txt`)
6. Run `python scripts/run_batch_inference.py` on the inference host to populate `lstm_predictions`

## Run locally

```bash
pip install -r requirements.txt
python scripts/check_supabase_counts.py
python api_server.py

cd frontend && npm ci && npm run dev
```

```bash
python scripts/smoke_test_backend.py
python scripts/run_batch_inference.py
cd frontend && npm run build
```

## Python dependencies

| File | Use |
|------|-----|
| `requirements.txt` | Full install: API + Supabase + PyTorch inference |
| `api/requirements.txt` | Vercel only (no PyTorch) |

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Model metadata + Supabase status |
| GET | `/api/admin-units` | District admin units |
| GET | `/api/predictions/latest` | Latest prediction per district |
| GET | `/api/predictions/<admin_id>` | One district prediction |
| GET | `/api/context-summary` | Hydromet averages for panel |
| GET | `/api/daily-features/<admin_id>` | Daily feature rows |
| POST | `/api/inference` | `{ "admin_id", "date" }` — inference host only |
| POST | `/api/inference/batch` | Province or district batch — inference host only |

## Wording

UI/API label: **7-day flood-risk probability** — not confirmed flood occurrence.
