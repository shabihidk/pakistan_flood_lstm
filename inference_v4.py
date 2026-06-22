"""National district LSTM inference (flood_lstm_v4 / Supabase)."""

from __future__ import annotations

import importlib.util
import json
import os
import sys
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
DEFAULT_MODEL_DIR = ROOT / "models" / "flood_lstm_v4"
MODEL_NAME = "Flood_LSTMV4"


def resolve_model_version() -> str:
    env = os.getenv("MODEL_VERSION", "").strip()
    return env or MODEL_NAME


class InferenceV4Error(Exception):
    pass


def get_model_dir() -> Path:
    env = os.getenv("MODEL_DIR", "").strip()
    if env:
        return Path(env)
    return DEFAULT_MODEL_DIR


def classify_alert(probability: float) -> str:
    """Alert bands from Colab inference_batch.py (0–1 probability)."""
    p = probability / 100.0 if probability > 1.0 else probability
    if p >= 0.75:
        return "very_high"
    if p >= 0.50:
        return "high"
    if p >= 0.25:
        return "moderate"
    return "low"


def _load_model_class(model_dir: Path):
    spec_path = model_dir / "model_definition.py"
    if not spec_path.exists():
        raise InferenceV4Error(f"Missing model_definition.py in {model_dir}")
    spec = importlib.util.spec_from_file_location("flood_lstm_v4_model_definition", spec_path)
    if spec is None or spec.loader is None:
        raise InferenceV4Error("Could not load model_definition.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module.FloodLSTM


@lru_cache(maxsize=1)
def load_model_bundle():
    model_dir = get_model_dir()
    meta_path = model_dir / "model_meta.json"
    if not meta_path.exists():
        raise InferenceV4Error(f"Missing model_meta.json in {model_dir}")

    with open(meta_path, encoding="utf-8") as handle:
        meta = json.load(handle)

    checkpoint_candidates = [
        model_dir / "flood_lstm_v4_csv_supabase_final.pth",
        model_dir / "best_flood_lstm.pth",
    ]
    checkpoint_path = next((p for p in checkpoint_candidates if p.exists()), None)
    if checkpoint_path is None:
        raise InferenceV4Error(
            f"No checkpoint found in {model_dir}. Copy best_flood_lstm.pth from Colab artifacts."
        )

    dyn_scaler_path = model_dir / "dynamic_scaler.joblib"
    stat_scaler_path = model_dir / "static_scaler.joblib"
    if not dyn_scaler_path.exists() or not stat_scaler_path.exists():
        raise InferenceV4Error(f"Missing scaler joblib files in {model_dir}")

    try:
        import torch
    except ImportError as exc:
        raise InferenceV4Error(
            "PyTorch is required for v4 inference. Install: pip install -r requirements.txt"
        ) from exc

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    FloodLSTM = _load_model_class(model_dir)
    model = FloodLSTM(
        dynamic_input_size=meta["dynamic_input_size"],
        static_input_size=meta["static_input_size"],
        hidden_size=meta["hidden_size"],
        num_layers=meta["num_layers"],
        dropout=meta["dropout"],
    ).to(device)

    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
    state = checkpoint.get("model_state_dict", checkpoint)
    model.load_state_dict(state)
    model.eval()

    dyn_scaler = joblib.load(dyn_scaler_path)
    stat_scaler = joblib.load(stat_scaler_path)

    return {
        "model": model,
        "meta": meta,
        "dyn_scaler": dyn_scaler,
        "stat_scaler": stat_scaler,
        "device": device,
        "model_dir": str(model_dir),
        "checkpoint": str(checkpoint_path),
    }


def model_status() -> dict[str, Any]:
    model_dir = get_model_dir()
    meta_path = model_dir / "model_meta.json"
    status: dict[str, Any] = {
        "model_dir": str(model_dir),
        "model_version": resolve_model_version(),
        "model_name": MODEL_NAME,
        "loaded": False,
        "horizon_days": 7,
        "target_col": "Target_7Day",
    }
    if meta_path.exists():
        with open(meta_path, encoding="utf-8") as handle:
            meta = json.load(handle)
        status.update(
            {
                "model_version": resolve_model_version(),
                "horizon_days": meta.get("horizon_days", 7),
                "target_col": meta.get("target_col", "Target_7Day"),
                "window_size": meta.get("window_size"),
                "best_threshold": meta.get("best_threshold"),
                "dynamic_cols": meta.get("dynamic_cols"),
                "static_cols": meta.get("static_cols"),
            }
        )
    try:
        load_model_bundle()
        status["loaded"] = True
    except Exception as exc:
        status["load_error"] = str(exc)
    return status


def predict_from_frames(
    dynamic_df: pd.DataFrame,
    static_df: pd.DataFrame,
    bundle: dict | None = None,
) -> dict[str, Any]:
    bundle = bundle or load_model_bundle()
    meta = bundle["meta"]
    dynamic_cols = meta["dynamic_cols"]
    static_cols = meta["static_cols"]
    window_size = int(meta["window_size"])

    if len(dynamic_df) < window_size:
        raise InferenceV4Error(
            f"Need at least {window_size} days of daily_features; got {len(dynamic_df)}."
        )

    recent = dynamic_df.tail(window_size)
    missing_dyn = [c for c in dynamic_cols if c not in recent.columns]
    if missing_dyn:
        raise InferenceV4Error(f"Missing engineered dynamic columns: {missing_dyn}")

    missing_stat = [c for c in static_cols if c not in static_df.columns]
    if missing_stat:
        raise InferenceV4Error(f"Missing static columns: {missing_stat}")

    import torch

    x_dyn = bundle["dyn_scaler"].transform(recent[dynamic_cols])
    x_stat = bundle["stat_scaler"].transform(static_df[static_cols])

    x_dyn_t = torch.tensor(x_dyn, dtype=torch.float32).unsqueeze(0).to(bundle["device"])
    x_stat_t = torch.tensor(x_stat, dtype=torch.float32).to(bundle["device"])

    with torch.no_grad():
        logits = bundle["model"](x_dyn_t, x_stat_t)
        prob = float(torch.sigmoid(logits).cpu().numpy()[0])

    return {
        "probability": round(prob * 100, 2),
        "probability_raw": prob,
        "alert_level": classify_alert(prob),
        "threshold": float(meta.get("best_threshold", 0.5)),
        "model_version": resolve_model_version(),
        "horizon_days": int(meta.get("horizon_days", 7)),
        "source": MODEL_NAME,
        "forecast_date": date.today().isoformat(),
    }


FORECAST_HORIZON_DAYS = 7


def _prepare_admin_frames(
    admin_id: str,
    anchor_date: str,
    bundle: dict | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    from services.feature_store import (
        engineer_dynamic_frame,
        fetch_daily_features,
        fetch_latest_ndvi,
        fetch_static_features,
        prepare_static_row,
    )

    bundle = bundle or load_model_bundle()
    meta = bundle["meta"]
    window_size = int(meta["window_size"])
    horizon = int(meta.get("horizon_days", FORECAST_HORIZON_DAYS))
    anchor = pd.Timestamp(anchor_date).normalize()

    # Need window days ending on each staggered anchor through anchor-(horizon-1)
    lookback_days = window_size + horizon + 30
    daily = fetch_daily_features(admin_id, limit=lookback_days, end_date=anchor_date)
    if daily.empty:
        raise InferenceV4Error(f"No daily_features rows for admin_id={admin_id}")

    ndvi_row = fetch_latest_ndvi(admin_id) if any(
        c.startswith("ndvi") for c in meta.get("dynamic_cols", [])
    ) else None
    engineered = engineer_dynamic_frame(daily, meta, ndvi_row)

    static_row = fetch_static_features(admin_id)
    if not static_row:
        raise InferenceV4Error(f"No static_features row for admin_id={admin_id}")
    static_df = prepare_static_row(static_row, meta["static_cols"])
    return engineered, static_df, bundle


def predict_at_anchor(
    engineered: pd.DataFrame,
    static_df: pd.DataFrame,
    anchor_date: str,
    bundle: dict | None = None,
) -> dict[str, Any]:
    bundle = bundle or load_model_bundle()
    anchor = pd.Timestamp(anchor_date).normalize()
    subset = engineered[engineered["date"] <= anchor].copy()
    result = predict_from_frames(subset, static_df, bundle)
    result["forecast_date"] = anchor.strftime("%Y-%m-%d")
    return result


def build_sequential_outlook(
    admin_id: str,
    anchor_date: str,
    engineered: pd.DataFrame | None = None,
    static_df: pd.DataFrame | None = None,
    bundle: dict | None = None,
) -> list[dict[str, Any]]:
    """
    7-day forward outlook using staggered inference anchors (anchor, anchor-1, … anchor-6).
    Each run outputs the trained 7-day flood-risk probability for that anchor day.
    """
    if engineered is None or static_df is None or bundle is None:
        engineered, static_df, bundle = _prepare_admin_frames(admin_id, anchor_date, bundle)
    meta = bundle["meta"]
    window_size = int(meta["window_size"])
    horizon = int(meta.get("horizon_days", FORECAST_HORIZON_DAYS))
    anchor = pd.Timestamp(anchor_date).normalize()
    available = set(engineered["date"].dt.normalize())

    earliest_inference = anchor - pd.Timedelta(days=horizon - 1)
    if earliest_inference not in available:
        raise InferenceV4Error(
            f"Need daily_features through {earliest_inference.date()} "
            f"({horizon - 1} days before anchor) for the 7-day outlook."
        )

    earliest_window_start = earliest_inference - pd.Timedelta(days=window_size - 1)
    if min(available) > earliest_window_start:
        raise InferenceV4Error(
            f"Need {window_size} days of history before {earliest_inference.date()}."
        )

    outlook: list[dict[str, Any]] = []
    for offset in range(horizon):
        inference_date = (anchor - pd.Timedelta(days=offset)).strftime("%Y-%m-%d")
        forecast_date = (anchor + pd.Timedelta(days=offset + 1)).strftime("%Y-%m-%d")
        pred = predict_at_anchor(engineered, static_df, inference_date, bundle)
        outlook.append(
            {
                "day": offset + 1,
                "date": forecast_date,
                "inferenceAnchor": inference_date,
                "probability": pred["probability"],
                "alert_level": pred["alert_level"],
                "windowDays": horizon,
            }
        )
    return outlook


def get_inference_payload(
    admin_id: str,
    anchor_date: str,
    upsert: bool = False,
) -> dict[str, Any]:
    from services.prediction_store import upsert_prediction

    engineered, static_df, bundle = _prepare_admin_frames(admin_id, anchor_date)
    primary = predict_at_anchor(engineered, static_df, anchor_date, bundle)
    outlook = build_sequential_outlook(
        admin_id, anchor_date, engineered, static_df, bundle
    )

    payload = {
        "admin_id": admin_id,
        "anchorDate": anchor_date,
        "primaryForecast": {
            "date": anchor_date,
            "probability": primary["probability"],
            "alert_level": primary["alert_level"],
            "horizonDays": int(bundle["meta"].get("horizon_days", FORECAST_HORIZON_DAYS)),
        },
        "forecasts": outlook,
        "threshold": primary["threshold"],
        "model_version": primary["model_version"],
        "generatedAt": pd.Timestamp.utcnow().isoformat(),
        "source": MODEL_NAME,
    }

    if upsert:
        upsert_prediction(
            {
                **primary,
                "admin_id": admin_id,
                "forecast_date": anchor_date,
            }
        )

    return payload


def run_inference_for_admin(
    admin_id: str,
    anchor_date: str | None = None,
    upsert: bool = False,
) -> dict[str, Any]:
    if not anchor_date:
        from services.feature_store import fetch_date_bounds

        bounds = fetch_date_bounds(admin_id)
        anchor_date = bounds.get("max")
        if not anchor_date:
            raise InferenceV4Error(f"No daily_features dates for admin_id={admin_id}")
    return get_inference_payload(admin_id, anchor_date, upsert=upsert)


def run_batch_inference(
    admin_ids: list[str] | None = None,
    anchor_date: str | None = None,
    upsert: bool = True,
) -> list[dict[str, Any]]:
    from services.feature_store import fetch_admin_units
    from services.prediction_store import upsert_predictions

    if admin_ids is None:
        admin_ids = [row["admin_id"] for row in fetch_admin_units("district")]

    results: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    for admin_id in admin_ids:
        try:
            from services.feature_store import fetch_date_bounds

            resolved_date = anchor_date
            if not resolved_date:
                bounds = fetch_date_bounds(admin_id)
                resolved_date = bounds.get("max")
            if not resolved_date:
                errors.append({"admin_id": admin_id, "error": "no daily_features dates"})
                continue
            result = get_inference_payload(admin_id, resolved_date, upsert=False)
            results.append(
                {
                    "admin_id": admin_id,
                    "forecast_date": resolved_date,
                    "horizon_days": result["primaryForecast"]["horizonDays"],
                    "model_version": result["model_version"],
                    "probability": result["primaryForecast"]["probability"],
                    "alert_level": result["primaryForecast"]["alert_level"],
                    "threshold": result["threshold"],
                    "source": MODEL_NAME,
                    "forecasts": result["forecasts"],
                }
            )
        except Exception as exc:
            errors.append({"admin_id": admin_id, "error": str(exc)})

    if upsert and results:
        upsert_predictions(results)

    if errors:
        print(f"[batch] {len(errors)} districts skipped/failed")
        for item in errors[:5]:
            print(" ", item)

    return results
