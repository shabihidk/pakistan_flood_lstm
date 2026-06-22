"""Flask API — Supabase district flood-risk dashboard + Flood_LSTMV4 inference."""

import os

from dotenv import load_dotenv

load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS

from services.feature_store import (
    fetch_admin_ids_for_province,
    fetch_admin_units,
    fetch_all_table_counts,
    fetch_daily_features_range,
    fetch_date_bounds,
    fetch_static_features,
    summarize_daily_context,
)
from services.prediction_store import fetch_latest_predictions, fetch_prediction_for_admin
from services.supabase_client import check_supabase_connection, supabase_configured
from services.env_config import redact_status_dict, sanitize_error_message

app = Flask(__name__)
CORS(app)

_IS_VERCEL = bool(os.getenv("VERCEL"))


def _inference_module():
    from inference_v4 import (
        InferenceV4Error,
        get_inference_payload,
        model_status,
        run_batch_inference,
    )

    return InferenceV4Error, get_inference_payload, model_status, run_batch_inference


@app.get("/api/health")
def health():
    supabase = check_supabase_connection()
    if _IS_VERCEL:
        status = {
            "loaded": False,
            "model_version": os.getenv("MODEL_VERSION", "Flood_LSTMV4"),
            "note": "Inference runs on a dedicated host; this deployment serves the API proxy.",
        }
    else:
        _, _, model_status, _ = _inference_module()
        status = redact_status_dict(model_status())
    return jsonify(
        {
            "status": "ok",
            "model": status,
            "supabase": supabase,
            "model_version": status.get("model_version"),
            "horizon_days": status.get("horizon_days", 7),
            "target_col": status.get("target_col", "Target_7Day"),
            "label_note": "7-day flood-risk probability — not confirmed flood occurrence.",
        }
    )


@app.get("/api/admin-units")
def admin_units():
    if not supabase_configured():
        return jsonify({"error": "Supabase not configured on server."}), 503
    try:
        level = request.args.get("level", "district")
        units = fetch_admin_units(level=level)
        return jsonify({"units": units, "count": len(units)})
    except Exception as exc:
        return jsonify({"error": sanitize_error_message(exc)}), 500


@app.get("/api/predictions/latest")
def predictions_latest():
    if not supabase_configured():
        return jsonify({"error": "Supabase not configured on server."}), 503
    try:
        rows = fetch_latest_predictions()
        return jsonify({"predictions": rows, "count": len(rows)})
    except Exception as exc:
        return jsonify({"error": sanitize_error_message(exc)}), 500


@app.get("/api/predictions/<path:admin_id>")
def prediction_one(admin_id: str):
    if not supabase_configured():
        return jsonify({"error": "Supabase not configured on server."}), 503
    try:
        row = fetch_prediction_for_admin(admin_id)
        if not row:
            return jsonify({"error": f"No prediction for admin_id={admin_id}"}), 404
        return jsonify(row)
    except Exception as exc:
        return jsonify({"error": sanitize_error_message(exc)}), 500


@app.post("/api/inference")
def inference():
    if _IS_VERCEL:
        return jsonify({"error": "Live inference is not available on this host. Use a dedicated inference server."}), 503

    payload = request.get_json(silent=True) or {}
    admin_id = payload.get("admin_id")
    anchor_date = payload.get("date") or payload.get("anchor_date")
    upsert = bool(payload.get("upsert", False))

    if not admin_id:
        return jsonify({"error": "'admin_id' is required (e.g. district:punjab:jhang)."}), 400
    if not anchor_date:
        return jsonify({"error": "'date' is required (YYYY-MM-DD anchor for 7-day inference)."}), 400

    try:
        InferenceV4Error, get_inference_payload, _, _ = _inference_module()
        result = get_inference_payload(admin_id, anchor_date, upsert=upsert)
        return jsonify(result)
    except InferenceV4Error as exc:
        return jsonify({"error": sanitize_error_message(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Inference failed: {sanitize_error_message(exc)}"}), 500


@app.get("/api/static-features/<path:admin_id>")
def static_features(admin_id: str):
    if not supabase_configured():
        return jsonify({"error": "Supabase not configured on server."}), 503
    try:
        row = fetch_static_features(admin_id)
        if not row:
            return jsonify({"error": f"No static_features for admin_id={admin_id}"}), 404
        return jsonify(row)
    except Exception as exc:
        return jsonify({"error": sanitize_error_message(exc)}), 500


@app.get("/api/context-summary")
def context_summary():
    if not supabase_configured():
        return jsonify({"error": "Supabase not configured on server."}), 503
    anchor_date = request.args.get("date")
    if not anchor_date:
        return jsonify({"error": "'date' is required (YYYY-MM-DD)."}), 400
    days = int(request.args.get("days", 7))
    admin_id = request.args.get("admin_id")
    province = request.args.get("province")
    try:
        if admin_id:
            admin_ids = [admin_id]
        elif province:
            admin_ids = fetch_admin_ids_for_province(province)
        else:
            return jsonify({"error": "Provide admin_id or province."}), 400
        summary = summarize_daily_context(admin_ids, anchor_date, days=days)
        return jsonify(summary)
    except Exception as exc:
        return jsonify({"error": sanitize_error_message(exc)}), 500


@app.get("/api/daily-features/<path:admin_id>")
def daily_features(admin_id: str):
    if not supabase_configured():
        return jsonify({"error": "Supabase not configured on server."}), 503
    start_date = request.args.get("from")
    end_date = request.args.get("to")
    limit = request.args.get("limit", type=int)
    try:
        df = fetch_daily_features_range(admin_id, start_date, end_date)
        if limit and limit > 0 and not df.empty:
            df = df.tail(limit)
        rows = df.to_dict(orient="records") if not df.empty else []
        for row in rows:
            if hasattr(row.get("date"), "strftime"):
                row["date"] = row["date"].strftime("%Y-%m-%d")
        bounds = fetch_date_bounds(admin_id)
        return jsonify({"rows": rows, "count": len(rows), "bounds": bounds})
    except Exception as exc:
        return jsonify({"error": sanitize_error_message(exc)}), 500


@app.post("/api/inference/batch")
def inference_batch():
    if _IS_VERCEL:
        return jsonify({"error": "Batch inference is not available on this host. Use a dedicated inference server."}), 503

    payload = request.get_json(silent=True) or {}
    admin_ids = payload.get("admin_ids")
    province = payload.get("province")
    anchor_date = payload.get("date") or payload.get("anchor_date")
    upsert = bool(payload.get("upsert", False))

    if not admin_ids and province:
        admin_ids = fetch_admin_ids_for_province(province)
    if not admin_ids:
        return jsonify({"error": "Provide admin_ids or province."}), 400

    try:
        InferenceV4Error, _, _, run_batch_inference = _inference_module()
        results = run_batch_inference(
            admin_ids=admin_ids,
            anchor_date=anchor_date,
            upsert=upsert,
        )
        alert_counts: dict[str, int] = {}
        for row in results:
            level = row.get("alert_level", "unknown")
            alert_counts[level] = alert_counts.get(level, 0) + 1
        return jsonify(
            {
                "count": len(results),
                "alert_distribution": alert_counts,
                "predictions": results,
            }
        )
    except InferenceV4Error as exc:
        return jsonify({"error": sanitize_error_message(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Batch inference failed: {sanitize_error_message(exc)}"}), 500


@app.get("/api/supabase/counts")
def supabase_counts():
    """Debug endpoint mirroring scripts/check_supabase_counts.py."""
    if not supabase_configured():
        return jsonify({"error": "Supabase not configured."}), 503
    try:
        return jsonify(fetch_all_table_counts())
    except Exception as exc:
        return jsonify({"error": sanitize_error_message(exc)}), 500


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "false").lower() in {"1", "true", "yes"}
    app.run(host="0.0.0.0", port=5000, debug=debug)
