import glob
import json
import os
import re
from datetime import datetime, timedelta
from typing import Tuple

import numpy as np
import pandas as pd
from jsonschema import ValidationError, validate

from config import BASE_PATH

DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_MODEL_FALLBACKS = (
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash",
)
MODEL_VERSION = os.getenv("MODEL_VERSION", "v1.5.0")
VALID_LOCATIONS = {"islamabad", "swat", "jhang", "quetta"}

CACHE_DIR = (
    "/tmp/audit_cache"
    if os.getenv("VERCEL") == "1"
    else os.path.join(os.path.dirname(__file__), "audit_cache")
)
os.makedirs(CACHE_DIR, exist_ok=True)
_gemini_client = None

EVIDENCE_SCHEMA = {
    "type": "object",
    "properties": {
        "impact_classification": {
            "type": "string",
            "enum": [
                "No Impact",
                "Minor Impact",
                "Moderate Impact",
                "Major Flood",
                "Catastrophic Flood",
                "Insufficient Evidence",
            ],
        },
        "confidence": {"type": "string", "enum": ["High", "Medium", "Low"]},
        "summary": {"type": "string"},
        "evidence": {"type": "string"},
        "sources": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "url": {"type": "string"},
                    "date": {"type": "string"},
                },
                "required": ["title", "url"],
            },
        },
    },
    "required": ["impact_classification", "confidence", "summary", "evidence", "sources"],
}

NORM_MAX = {"rain_14d": 350.0, "soil_moisture": 1.0, "pressure_drop": 20.0}
HISTORICAL_EVENTS_PATH = os.path.join(BASE_PATH, "historical_events.json")
FORECAST_HORIZON_DAYS = 7


def _forecast_evidence_window(target_dt: pd.Timestamp) -> Tuple[pd.Timestamp, pd.Timestamp]:
    """Match the LSTM label: impacts in the next 7 days after the anchor date."""
    window_start = pd.to_datetime(target_dt).normalize()
    window_end = window_start + timedelta(days=FORECAST_HORIZON_DAYS)
    return window_start, window_end


def _intervals_overlap(
    left_start: pd.Timestamp,
    left_end: pd.Timestamp,
    right_start: pd.Timestamp,
    right_end: pd.Timestamp,
) -> bool:
    return left_start <= right_end and left_end >= right_start


def _normalize_probability(predicted_probability: float) -> float:
    if predicted_probability > 1.0:
        return predicted_probability / 100.0
    return predicted_probability


def _configure_gemini():
    if not os.getenv("GEMINI_API_KEY"):
        raise ValueError("CRITICAL: GEMINI_API_KEY environment variable is missing.")


def _gemini_model_candidates() -> list[str]:
    preferred = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL).strip()
    candidates = []
    for model in [preferred, *GEMINI_MODEL_FALLBACKS]:
        if model and model not in candidates:
            candidates.append(model)
    return candidates


def _format_gemini_error(error: Exception) -> str:
    message = str(error)
    if "429" in message or "RESOURCE_EXHAUSTED" in message:
        return (
            "Gemini API quota exceeded. Wait a minute and retry, enable billing, "
            "or use a date covered by historical_events.json."
        )
    if "404" in message and "not found" in message.lower():
        return (
            "Configured Gemini model is unavailable. Set GEMINI_MODEL=gemini-2.0-flash "
            "in .env and restart the API server."
        )
    if "API key not valid" in message or "API_KEY_INVALID" in message:
        return "Invalid GEMINI_API_KEY. Create a key at https://aistudio.google.com/apikey"
    return message


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        _configure_gemini()
        from google import genai

        _gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    return _gemini_client


def _parse_json_from_text(text: str) -> dict:
    cleaned = text.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
    if fenced:
        return json.loads(fenced.group(1))

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(cleaned[start : end + 1])

    return json.loads(cleaned)


def _sanitize_evidence_payload(data) -> dict:
    """Coerce null/missing LLM fields into schema-safe values."""
    if not isinstance(data, dict):
        raise ValueError("LLM response must be a JSON object.")

    valid_impacts = EVIDENCE_SCHEMA["properties"]["impact_classification"]["enum"]
    valid_confidence = EVIDENCE_SCHEMA["properties"]["confidence"]["enum"]

    impact = data.get("impact_classification")
    confidence = data.get("confidence")
    summary = data.get("summary")
    evidence = data.get("evidence")

    sanitized = {
        "impact_classification": impact if impact in valid_impacts else "Insufficient Evidence",
        "confidence": confidence if confidence in valid_confidence else "Low",
        "summary": "" if summary is None else str(summary),
        "evidence": "" if evidence is None else str(evidence),
        "sources": [],
    }

    raw_sources = data.get("sources")
    if isinstance(raw_sources, list):
        for item in raw_sources:
            if not isinstance(item, dict):
                continue
            title = item.get("title")
            url = item.get("url")
            if title is None and url is None:
                continue
            source = {
                "title": str(title) if title is not None else "Web source",
                "url": str(url) if url is not None else "unknown",
            }
            date_val = item.get("date")
            if date_val is not None:
                source["date"] = str(date_val)
            sanitized["sources"].append(source)

    return sanitized


def _sources_from_grounding(response) -> list[dict]:
    sources = []
    try:
        metadata = response.candidates[0].grounding_metadata
        if metadata and metadata.grounding_chunks:
            for chunk in metadata.grounding_chunks:
                if chunk.web and chunk.web.uri:
                    sources.append(
                        {
                            "title": chunk.web.title or "Web source",
                            "url": chunk.web.uri,
                        }
                    )
    except (AttributeError, IndexError, TypeError):
        return sources
    return sources


def load_historical_events():
    try:
        with open(HISTORICAL_EVENTS_PATH, "r", encoding="utf-8") as handle:
            events = json.load(handle)
            for event in events:
                if (
                    event.get("impact_classification")
                    not in EVIDENCE_SCHEMA["properties"]["impact_classification"]["enum"]
                ):
                    raise ValueError(f"Invalid impact classification in history: {event.get('name')}")
            return events
    except Exception as error:
        print(f"Warning: Failed to load historical_events.json. {error}")
        return []


HISTORICAL_EVENTS = load_historical_events()


def evaluate_forecast(predicted_prob: float, impact: str) -> dict:
    if impact in ["Major Flood", "Catastrophic Flood"]:
        if predicted_prob >= 0.70:
            return {
                "assessment": "Supports",
                "final_assessment": "Model successfully predicted the verified disaster.",
            }
        if predicted_prob < 0.40:
            return {
                "assessment": "Contradicts",
                "final_assessment": "CRITICAL FAILURE: Model missed a verified disaster (False Negative).",
            }
        return {
            "assessment": "Partially Supports",
            "final_assessment": "Model showed elevated risk but under-predicted the magnitude.",
        }

    if impact in ["No Impact", "Minor Impact"]:
        if predicted_prob < 0.40:
            return {
                "assessment": "Supports",
                "final_assessment": "Model correctly predicted safe conditions.",
            }
        if predicted_prob >= 0.70:
            return {
                "assessment": "Contradicts",
                "final_assessment": "CRITICAL FAILURE: Model hallucinated a disaster (False Positive).",
            }
        return {
            "assessment": "Partially Supports",
            "final_assessment": "Model was overly sensitive but avoided a strict false alarm.",
        }

    return {
        "assessment": "Insufficient Evidence",
        "final_assessment": "Cannot evaluate forecast due to lack of ground truth.",
    }


def compute_hydrological_diagnostics(df_window: pd.DataFrame, predicted_prob: float) -> dict:
    if df_window.empty:
        return {"telemetry_reliability_score": 0, "error": "No telemetry data available."}

    total_rows = len(df_window)
    rain_series = df_window.get("precipitation_mm", pd.Series([None] * total_rows))
    soil_series = df_window.get("soil_moisture", pd.Series([None] * total_rows))

    max_gap_days = 0
    if not df_window["Date"].empty:
        gaps = df_window["Date"].sort_values().diff().dt.days
        max_gap_days = int(gaps.max()) if not pd.isna(gaps.max()) else 0

    metrics = {
        "rain_missing_pct": float(rain_series.isna().sum() / total_rows),
        "soil_missing_pct": float(soil_series.isna().sum() / total_rows),
        "max_telemetry_gap_days": max_gap_days,
        "rolling_14d_rain_peak": float(df_window.get("rain_14d", pd.Series([0])).max()),
        "soil_moisture_peak": float(soil_series.max()),
        "low_variance_detected": bool(rain_series.var() < 0.01 and total_rows > 3),
    }

    score = 100.0
    score -= metrics["rain_missing_pct"] * 40
    score -= metrics["soil_missing_pct"] * 30
    # Daily CSV cadence is a 1-day diff between rows — only penalize actual holes (>1 day).
    gap_penalty_days = max(0, max_gap_days - 1)
    score -= min(gap_penalty_days, 5) * 10
    if metrics["low_variance_detected"]:
        score -= 20

    findings = []
    rain_norm = min(1.0, metrics["rolling_14d_rain_peak"] / NORM_MAX["rain_14d"])
    soil_norm = min(1.0, metrics["soil_moisture_peak"] / NORM_MAX["soil_moisture"])
    expected_physics_risk = (rain_norm * 0.55) + (soil_norm * 0.45)
    prediction_residual = predicted_prob - expected_physics_risk

    if abs(prediction_residual) > 0.40:
        findings.append(
            f"⚠️ High Prediction Residual ({prediction_residual:+.2f}). "
            "Model deviates strongly from basic physical heuristics."
        )
    if metrics["rolling_14d_rain_peak"] < 5 and metrics["soil_moisture_peak"] > 0.85:
        findings.append("❌ Mismatch: Saturation without rain. Sensor artifact likely.")
        score -= 20

    metrics.update(
        {
            "telemetry_reliability_score": max(0.0, min(100.0, score)),
            "expected_physics_risk": float(expected_physics_risk),
            "prediction_residual": float(prediction_residual),
            "heuristic_findings": findings
            if findings
            else ["✅ Telemetry is continuous and hydrologically consistent."],
        }
    )
    return metrics


def get_evidence(location: str, target_dt: pd.Timestamp, target_date_str: str) -> dict:
    normalized_loc = location.strip().lower()
    window_start, window_end = _forecast_evidence_window(target_dt)
    search_start = window_start.strftime("%Y-%m-%d")
    search_end = window_end.strftime("%Y-%m-%d")

    for event in HISTORICAL_EVENTS:
        event_start = pd.to_datetime(event["start"])
        event_end = pd.to_datetime(event["end"])
        if (
            event.get("location", "").strip().lower() == normalized_loc
            and _intervals_overlap(window_start, window_end, event_start, event_end)
        ):
            return {
                "impact_classification": event["impact_classification"],
                "confidence": "High",
                "summary": event.get("summary", ""),
                "evidence": (
                    "Historical event mapped via internal database for the model's "
                    f"{FORECAST_HORIZON_DAYS}-day forecast window ({search_start} to {search_end})."
                ),
                "sources": event.get("sources", []),
                "provenance": "historical_database",
                "search_window": {"start": search_start, "end": search_end},
            }

    cache_key = f"{normalized_loc}_{target_date_str}_evidence_h{FORECAST_HORIZON_DAYS}.json"
    cache_path = os.path.join(CACHE_DIR, cache_key)
    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as handle:
            data = _sanitize_evidence_payload(json.load(handle))
            data["provenance"] = "disk_cache"
            return data

    _configure_gemini()
    result_json = _fetch_llm_evidence(location, search_start, search_end)
    result_json.update(
        {
            "provenance": "live_llm",
            "search_window": {"start": search_start, "end": search_end},
        }
    )
    with open(cache_path, "w", encoding="utf-8") as handle:
        json.dump(result_json, handle)
    return result_json


def _fetch_llm_evidence(location: str, search_start: str, search_end: str) -> dict:
    from google.genai import types

    prompt = f"""
You are a Hydrological Data Researcher.
Location: {location}
Search Window: {search_start} to {search_end}
The LSTM model predicts flood risk for the NEXT {FORECAST_HORIZON_DAYS} days after the anchor date.
Search for public news or meteorological reports of actual on-the-ground flooding or monsoon impacts within this forward-looking window only.
CRITICAL RULE: Determine ONLY what happened on the ground during the Search Window. Classify the impact. If search coverage is weak or no articles exist, return "Insufficient Evidence". Do not guess.
Return ONLY valid JSON with these keys:
impact_classification, confidence, summary, evidence, sources
Never use null. Use empty strings for unknown text and [] for no sources. Omit source "date" if unknown.
Schema reference: {json.dumps(EVIDENCE_SCHEMA)}
"""

    client = _get_gemini_client()
    last_error = None

    for model_name in _gemini_model_candidates():
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    tools=[types.Tool(google_search=types.GoogleSearch())],
                    temperature=0.2,
                ),
            )

            response_text = getattr(response, "text", None)
            if not response_text:
                raise ValueError("Gemini returned an empty response.")

            result_json = _sanitize_evidence_payload(_parse_json_from_text(response_text))
            validate(instance=result_json, schema=EVIDENCE_SCHEMA)

            if not result_json.get("sources"):
                grounding_sources = _sources_from_grounding(response)
                if grounding_sources:
                    result_json["sources"] = _sanitize_evidence_payload(
                        {**result_json, "sources": grounding_sources}
                    )["sources"]

            result_json["llm_model"] = model_name
            return result_json
        except ValidationError as error:
            last_error = error
            continue
        except Exception as error:
            last_error = error
            continue

    raise RuntimeError(_format_gemini_error(last_error or RuntimeError("Gemini request failed.")))


def run_deep_audit(
    location: str,
    target_date_str: str,
    predicted_probability: float,
    diagnostics: dict,
) -> dict:
    if location.strip().lower() not in VALID_LOCATIONS:
        return {"error": f"Invalid location. Must be one of {VALID_LOCATIONS}"}

    predicted_probability = _normalize_probability(predicted_probability)

    try:
        evidence_data = get_evidence(location, pd.to_datetime(target_date_str), target_date_str)
        evaluation = evaluate_forecast(predicted_probability, evidence_data["impact_classification"])

        final_confidence = evidence_data["confidence"]
        telemetry_score = diagnostics.get("telemetry_reliability_score", 100)
        confidence_reason = "Based on evidence strength."

        if telemetry_score < 40 and final_confidence != "Low":
            final_confidence = "Low"
            confidence_reason = "Confidence downgraded due to extremely poor telemetry reliability."

        return {
            **evidence_data,
            **evaluation,
            "confidence": final_confidence,
            "confidence_reason": confidence_reason,
            "prediction_residual": diagnostics.get("prediction_residual"),
            "telemetry_score": telemetry_score,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "model_version": MODEL_VERSION,
        }
    except ValidationError as error:
        path = ".".join(str(part) for part in error.absolute_path) or "root"
        return {"error": f"LLM returned invalid JSON schema at {path}: {error.message}"}
    except Exception as error:
        return {"error": _format_gemini_error(error)}


def get_quick_diagnostics(location: str, target_date_str: str, predicted_probability: float):
    if location.strip().lower() not in VALID_LOCATIONS:
        return {"error": "Invalid location"}

    predicted_probability = _normalize_probability(predicted_probability)
    dynamic_files = glob.glob(os.path.join(BASE_PATH, f"Dynamic_{location}_*.csv"))
    if not dynamic_files:
        return {"error": f"No dynamic telemetry files found for {location}."}

    try:
        df_dynamic = pd.concat([pd.read_csv(path) for path in dynamic_files], ignore_index=True)
        df_dynamic["Date"] = pd.to_datetime(df_dynamic["Date"])
        if "rain_14d" not in df_dynamic.columns:
            df_dynamic["rain_14d"] = df_dynamic["precipitation_mm"].rolling(14, min_periods=1).sum()

        target_date = pd.to_datetime(target_date_str)
        df_window = df_dynamic[
            (df_dynamic["Date"] >= target_date - timedelta(days=3))
            & (df_dynamic["Date"] <= target_date + timedelta(days=3))
        ]
        return compute_hydrological_diagnostics(df_window, predicted_probability)
    except Exception as error:
        return {"error": str(error)}
