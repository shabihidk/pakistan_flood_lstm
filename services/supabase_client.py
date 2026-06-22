"""Supabase client for backend (service role). Never import from frontend."""

from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

from services.env_config import sanitize_error_message, validate_backend_env

load_dotenv()
validate_backend_env()


class SupabaseConfigError(Exception):
    pass


@lru_cache(maxsize=1)
def get_supabase_client():
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        raise SupabaseConfigError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for backend Supabase access."
        )
    from supabase import create_client

    return create_client(url, key)


def supabase_configured() -> bool:
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    return bool(url and key)


def check_supabase_connection() -> dict:
    if not supabase_configured():
        return {"ok": False, "error": "Supabase env vars not configured"}
    try:
        client = get_supabase_client()
        res = client.table("admin_units").select("admin_id", count="exact").limit(1).execute()
        count = getattr(res, "count", None)
        return {"ok": True, "admin_units_sample_count": count}
    except Exception as exc:
        return {"ok": False, "error": sanitize_error_message(exc)}
