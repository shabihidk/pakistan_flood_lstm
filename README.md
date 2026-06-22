# Pakistan Flood LSTM (Flood_LSTMV4)

National **163-district** 7-day **flood-risk** dashboard backed by Supabase and the **Flood_LSTMV4** model.

> Model output is **flood-risk likelihood**, not confirmed flood occurrence.

## Quick start (local)

```bash
# 1. Environment
cp .env.example .env          # backend Supabase + model paths
cp frontend/.env.example frontend/.env   # optional: direct Supabase reads

# 2. Model artifacts → models/flood_lstm_v4/ (see models/flood_lstm_v4/README.md)
python scripts/validate_artifacts.py

# 3. Python deps (single file)
pip install -r requirements.txt

# 4. Backend
python api_server.py          # http://localhost:5000

# 5. Frontend
cd frontend && npm ci && npm run dev   # http://localhost:5173
```

## Production (Vercel)

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for env vars, Supabase RLS, and the split between:

- **Vercel** — static React app + read-only Supabase API proxy (`api/requirements.txt`, no PyTorch)
- **Inference host** — Flask with PyTorch for live / batch inference (`requirements.txt`)

```bash
cd frontend && npm run build
python scripts/smoke_test_backend.py
python scripts/run_batch_inference.py   # refresh lstm_predictions on inference host
```

## Layout

| Path | Role |
|------|------|
| `models/flood_lstm_v4/` | Flood_LSTMV4 Colab artifacts |
| `inference_v4.py` | District inference + feature engineering |
| `services/` | Supabase client, feature/prediction stores |
| `api_server.py` | Flask API (local + inference host) |
| `api/index.py` | Vercel serverless entry |
| `frontend/src/` | React map + district risk panel |

Copy `.env.example` → `.env` (backend) and `frontend/.env.example` → `frontend/.env`. Never commit real keys.

## Local data

Legacy 3-city training CSVs may live in `data/` on your machine; that folder is gitignored and not used by the Supabase dashboard.

## License

MIT — Shabih Ul Hassan
