#!/usr/bin/env python3
"""Smoke test backend health and Supabase reads (no inference if model missing)."""

from __future__ import annotations

import json
import sys

import requests
from dotenv import load_dotenv

load_dotenv()

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5000"


def get(path: str):
    url = f"{BASE.rstrip('/')}{path}"
    res = requests.get(url, timeout=30)
    return res.status_code, res.json() if res.content else {}


def main() -> int:
    code, health = get("/api/health")
    print("GET /api/health", code)
    print(json.dumps(health, indent=2))

    if not health.get("supabase", {}).get("ok"):
        print("WARN: Supabase not connected on server")

    code, preds = get("/api/predictions/latest")
    print("\nGET /api/predictions/latest", code, f"count={preds.get('count')}")

    code, units = get("/api/admin-units")
    print("GET /api/admin-units", code, f"count={units.get('count')}")

    return 0 if code == 200 else 1


if __name__ == "__main__":
    raise SystemExit(main())
