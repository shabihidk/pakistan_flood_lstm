import os
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS

from inference import InferenceError, SUPPORTED_LOCATIONS, get_inference_payload
from validate_pipeline import get_quick_diagnostics, run_deep_audit

app = Flask(__name__)
CORS(app)


def get_alert_level(probability_percent: float) -> str:
    if probability_percent > 75:
        return "high"
    if probability_percent >= 40:
        return "medium"
    return "low"


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "locations": SUPPORTED_LOCATIONS})


@app.post("/api/inference")
def inference():
    payload = request.get_json(silent=True) or {}
    location = payload.get("location")
    anchor_date = payload.get("date")

    if not location or not anchor_date:
        return jsonify({"error": "Both 'location' and 'date' are required."}), 400

    try:
        datetime.strptime(anchor_date, "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    try:
        result = get_inference_payload(location, anchor_date)
    except InferenceError as error:
        return jsonify({"error": str(error)}), 400
    except Exception as error:
        return jsonify({"error": f"Inference failed: {error}"}), 500

    result["primaryForecast"]["alertLevel"] = get_alert_level(
        result["primaryForecast"]["probability"]
    )
    result["forecasts"] = [
        {
            **forecast,
            "alertLevel": get_alert_level(forecast["probability"]),
        }
        for forecast in result["forecasts"]
    ]

    return jsonify(result)


@app.post("/api/audit/quick")
def quick_audit():
    payload = request.get_json(silent=True) or {}
    location = payload.get("location")
    target_date = payload.get("target_date")
    predicted_probability = payload.get("predicted_probability", 0)

    if not location or not target_date:
        return jsonify({"success": False, "error": "location and target_date are required."}), 400

    diagnostics = get_quick_diagnostics(location, target_date, float(predicted_probability))
    if "error" in diagnostics:
        return jsonify({"success": False, "error": diagnostics["error"]}), 400

    return jsonify({"success": True, "diagnostics": diagnostics})


@app.post("/api/audit/deep")
def deep_audit():
    payload = request.get_json(silent=True) or {}
    result = run_deep_audit(
        location=payload.get("location"),
        target_date_str=payload.get("target_date"),
        predicted_probability=float(payload.get("predicted_probability", 0)),
        diagnostics=payload.get("diagnostics", {}),
    )
    if "error" in result:
        return jsonify({"success": False, "error": result["error"]}), 500
    return jsonify({"success": True, "audit_data": result}), 200


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "false").lower() in {"1", "true", "yes"}
    app.run(host="0.0.0.0", port=5000, debug=debug)
