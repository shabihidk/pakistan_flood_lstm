#!/usr/bin/env python3
"""Run v4 LSTM inference for all districts and upsert lstm_predictions."""

from __future__ import annotations

import json
import sys
from collections import Counter

from dotenv import load_dotenv

load_dotenv()

from inference_v4 import run_batch_inference
from services.supabase_client import supabase_configured


def main() -> int:
    if not supabase_configured():
        print("ERROR: Supabase env vars required", file=sys.stderr)
        return 1

    results = run_batch_inference(admin_ids=None, upsert=True)
    alerts = Counter(r.get("alert_level") for r in results)
    print(f"Inferred {len(results)} districts")
    print("Alert distribution:", dict(alerts))
    print(json.dumps(results[:3], indent=2), "..." if len(results) > 3 else "")
    return 0 if results else 1


if __name__ == "__main__":
    raise SystemExit(main())
