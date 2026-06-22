#!/usr/bin/env python3
"""Print row counts for Supabase tables used by the district flood dashboard."""

from __future__ import annotations

import json
import sys

from dotenv import load_dotenv

load_dotenv()

from services.feature_store import fetch_all_table_counts
from services.supabase_client import supabase_configured


def main() -> int:
    if not supabase_configured():
        print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1
    counts = fetch_all_table_counts()
    print(json.dumps(counts, indent=2))
    return 0 if "error" not in counts else 1


if __name__ == "__main__":
    raise SystemExit(main())
