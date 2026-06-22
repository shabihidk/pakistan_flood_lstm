"""Read/write lstm_predictions in Supabase."""

from __future__ import annotations

from datetime import date
from typing import Any

from services.supabase_client import get_supabase_client


def fetch_latest_predictions() -> list[dict[str, Any]]:
    client = get_supabase_client()
    res = (
        client.table("lstm_predictions")
        .select("*")
        .order("forecast_date", desc=True)
        .execute()
    )
    rows = res.data or []
    latest_by_admin: dict[str, dict[str, Any]] = {}
    for row in rows:
        admin_id = row.get("admin_id")
        if not admin_id:
            continue
        if admin_id not in latest_by_admin:
            latest_by_admin[admin_id] = row
    return list(latest_by_admin.values())


def fetch_prediction_for_admin(admin_id: str) -> dict[str, Any] | None:
    client = get_supabase_client()
    res = (
        client.table("lstm_predictions")
        .select("*")
        .eq("admin_id", admin_id)
        .order("forecast_date", desc=True)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0] if rows else None


def upsert_prediction(record: dict[str, Any]) -> dict[str, Any]:
    client = get_supabase_client()
    payload = {
        "admin_id": record["admin_id"],
        "forecast_date": record.get("forecast_date") or date.today().isoformat(),
        "horizon_days": int(record.get("horizon_days", 7)),
        "model_version": record["model_version"],
        "probability": float(record["probability"]),
        "alert_level": record["alert_level"],
        "threshold": float(record.get("threshold", 0.5)),
        "source": record.get("source", "Flood_LSTMV4"),
    }
    res = client.table("lstm_predictions").upsert(payload, on_conflict="admin_id").execute()
    rows = res.data or []
    return rows[0] if rows else payload


def upsert_predictions(records: list[dict[str, Any]]) -> int:
    if not records:
        return 0
    client = get_supabase_client()
    payloads = []
    for record in records:
        payloads.append(
            {
                "admin_id": record["admin_id"],
                "forecast_date": record.get("forecast_date") or date.today().isoformat(),
                "horizon_days": int(record.get("horizon_days", 7)),
                "model_version": record["model_version"],
                "probability": float(record["probability"]),
                "alert_level": record["alert_level"],
                "threshold": float(record.get("threshold", 0.5)),
                "source": record.get("source", "Flood_LSTMV4"),
            }
        )
    client.table("lstm_predictions").upsert(payloads, on_conflict="admin_id").execute()
    return len(payloads)
