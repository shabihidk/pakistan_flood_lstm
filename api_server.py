from datetime import datetime

from flask import Flask, jsonify, request
from flask_cors import CORS

from inference import InferenceError, SUPPORTED_LOCATIONS, get_inference_payload

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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
