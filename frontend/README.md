# Flood Intelligence Frontend

React dashboard for the Pakistan LSTM flood prediction API.

## Run

```bash
npm install
npm run dev
```

Requires the Flask API on port 5000 (`python api_server.py` from the repo root).

## Build

```bash
npm run build
```

Optional env override:

```bash
VITE_API_BASE_URL=http://localhost:5000/api
```
