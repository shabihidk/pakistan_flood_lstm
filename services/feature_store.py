"""Fetch and engineer district features from Supabase."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from services.supabase_client import SupabaseConfigError, get_supabase_client


def _normalize_slug(value: str) -> str:
    return value.strip().lower().replace(" ", "_").replace("-", "_")


def fetch_admin_units(level: str = "district") -> list[dict[str, Any]]:
    client = get_supabase_client()
    res = (
        client.table("admin_units")
        .select("*")
        .eq("level", level)
        .order("province")
        .order("district")
        .execute()
    )
    return res.data or []


def fetch_admin_unit(admin_id: str) -> dict[str, Any] | None:
    client = get_supabase_client()
    res = client.table("admin_units").select("*").eq("admin_id", admin_id).limit(1).execute()
    rows = res.data or []
    return rows[0] if rows else None


def fetch_daily_features(
    admin_id: str,
    limit: int = 200,
    end_date: str | None = None,
) -> pd.DataFrame:
    client = get_supabase_client()
    query = client.table("daily_features").select("*").eq("admin_id", admin_id)
    if end_date:
        query = query.lte("date", end_date)
    res = query.order("date", desc=True).limit(limit).execute()
    rows = res.data or []
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    return df.sort_values("date").reset_index(drop=True)


def fetch_daily_features_range(
    admin_id: str,
    start_date: str | None = None,
    end_date: str | None = None,
) -> pd.DataFrame:
    client = get_supabase_client()
    query = client.table("daily_features").select("*").eq("admin_id", admin_id)
    if start_date:
        query = query.gte("date", start_date)
    if end_date:
        query = query.lte("date", end_date)
    res = query.order("date", desc=False).execute()
    rows = res.data or []
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    return df.sort_values("date").reset_index(drop=True)


def fetch_admin_ids_for_province(province: str) -> list[str]:
    slug = _normalize_slug(province)
    units = fetch_admin_units("district")
    ids: list[str] = []
    for unit in units:
        unit_province = unit.get("province")
        if not unit_province:
            continue
        if _normalize_slug(str(unit_province)) == slug:
            admin_id = unit.get("admin_id")
            if admin_id:
                ids.append(admin_id)
    return ids


def summarize_daily_context(
    admin_ids: list[str],
    anchor_date: str,
    days: int = 7,
) -> dict[str, Any]:
    """Average hydromet over the N days ending on anchor_date (inclusive)."""
    if not admin_ids:
        return {"days": days, "anchor_date": anchor_date, "sample_count": 0, "averages": {}}

    anchor = pd.Timestamp(anchor_date).normalize()
    start = (anchor - pd.Timedelta(days=days - 1)).strftime("%Y-%m-%d")
    end = anchor.strftime("%Y-%m-%d")

    numeric_cols = [
        "precipitation_mm",
        "soil_moisture",
        "temp_2m_c",
        "runoff_mm",
        "surface_pressure_pa",
    ]
    sums = {col: 0.0 for col in numeric_cols}
    counts = {col: 0 for col in numeric_cols}
    row_total = 0

    for admin_id in admin_ids:
        df = fetch_daily_features_range(admin_id, start, end)
        if df.empty:
            continue
        for _, row in df.iterrows():
            row_total += 1
            for col in numeric_cols:
                val = row.get(col)
                if val is None or (isinstance(val, float) and not np.isfinite(val)):
                    continue
                sums[col] += float(val)
                counts[col] += 1

    averages = {
        col: round(sums[col] / counts[col], 4) if counts[col] else None for col in numeric_cols
    }
    return {
        "days": days,
        "anchor_date": anchor_date,
        "from": start,
        "to": end,
        "admin_count": len(admin_ids),
        "sample_count": row_total,
        "averages": averages,
    }


def fetch_date_bounds(admin_id: str) -> dict[str, str | None]:
    client = get_supabase_client()
    min_res = (
        client.table("daily_features")
        .select("date")
        .eq("admin_id", admin_id)
        .order("date", desc=False)
        .limit(1)
        .execute()
    )
    max_res = (
        client.table("daily_features")
        .select("date")
        .eq("admin_id", admin_id)
        .order("date", desc=True)
        .limit(1)
        .execute()
    )
    min_rows = min_res.data or []
    max_rows = max_res.data or []
    return {
        "min": min_rows[0]["date"] if min_rows else None,
        "max": max_rows[0]["date"] if max_rows else None,
    }


def fetch_static_features(admin_id: str) -> dict[str, Any] | None:
    client = get_supabase_client()
    res = client.table("static_features").select("*").eq("admin_id", admin_id).limit(1).execute()
    rows = res.data or []
    return rows[0] if rows else None


def fetch_latest_ndvi(admin_id: str) -> dict[str, Any] | None:
    """Optional NDVI row; returns None if table empty or values unusable."""
    client = get_supabase_client()
    try:
        res = (
            client.table("ndvi_features")
            .select("*")
            .eq("admin_id", admin_id)
            .order("date", desc=True)
            .limit(1)
            .execute()
        )
    except Exception:
        return None
    rows = res.data or []
    if not rows:
        return None
    row = rows[0]
    ndvi = row.get("ndvi_mean") if "ndvi_mean" in row else row.get("ndvi")
    if ndvi is None or (isinstance(ndvi, float) and not np.isfinite(ndvi)):
        return None
    return row


def _source_is_centroid(source: Any) -> float:
    if source is None or (isinstance(source, float) and np.isnan(source)):
        return 0.0
    text = str(source).lower()
    return 1.0 if "centroid" in text else 0.0


def engineer_dynamic_frame(df: pd.DataFrame, meta: dict, ndvi_row: dict | None = None) -> pd.DataFrame:
    """Build dynamic_cols from raw daily_features rows (same logic as Colab training)."""
    if df.empty:
        return df

    out = df.sort_values("date").copy()
    precip = pd.to_numeric(out["precipitation_mm"], errors="coerce").fillna(0.0)
    out["precipitation_mm"] = precip
    out["rain_3d"] = precip.rolling(3, min_periods=1).sum()
    out["rain_7d"] = precip.rolling(7, min_periods=1).sum()
    out["rain_14d"] = precip.rolling(14, min_periods=1).sum()
    out["rain_30d"] = precip.rolling(30, min_periods=1).sum()

    out["soil_moisture"] = pd.to_numeric(out["soil_moisture"], errors="coerce").fillna(0.0)
    out["temp_2m_c"] = pd.to_numeric(out["temp_2m_c"], errors="coerce").fillna(0.0)
    out["surface_pressure_pa"] = pd.to_numeric(out["surface_pressure_pa"], errors="coerce").fillna(0.0)

    if "source" in out.columns:
        out["source_is_centroid"] = out["source"].map(_source_is_centroid)
    else:
        out["source_is_centroid"] = 0.0

    dynamic_cols = meta.get("dynamic_cols", [])
    if "ndvi_mean" in dynamic_cols or "ndvi_available" in dynamic_cols:
        ndvi_val = None
        if ndvi_row:
            ndvi_val = ndvi_row.get("ndvi_mean", ndvi_row.get("ndvi"))
        ndvi_available = (
            1.0 if ndvi_val is not None and np.isfinite(float(ndvi_val)) else 0.0
        )
        out["ndvi_mean"] = float(ndvi_val) * ndvi_available if ndvi_available else 0.0
        out["ndvi_available"] = ndvi_available

    return out


def prepare_static_row(static_row: dict[str, Any], static_cols: list[str]) -> pd.DataFrame:
    row = {col: static_row.get(col, 0.0) for col in static_cols}
    for col in static_cols:
        val = row[col]
        if val is None or (isinstance(val, float) and not np.isfinite(val)):
            row[col] = 0.0
        else:
            row[col] = float(val)
    return pd.DataFrame([row])


def count_table(table: str) -> int:
    client = get_supabase_client()
    res = client.table(table).select("*", count="exact").limit(1).execute()
    return int(getattr(res, "count", 0) or 0)


def fetch_all_table_counts() -> dict[str, int | str]:
    from services.supabase_client import supabase_configured

    if not supabase_configured():
        return {"error": "Supabase not configured"}
    tables = [
        "admin_units",
        "daily_features",
        "static_features",
        "ndvi_features",
        "flood_labels",
        "model_runs",
        "lstm_predictions",
    ]
    counts: dict[str, int | str] = {}
    for table in tables:
        try:
            counts[table] = count_table(table)
        except Exception as exc:
            counts[table] = f"error: {exc}"
    return counts
