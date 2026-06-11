import os
from functools import lru_cache
from typing import Tuple

import joblib
import numpy as np
import pandas as pd
import torch

from config import DYNAMIC_COLS, MODEL_DIR, STATIC_COLS, WINDOW_SIZE
from data_pipeline import process_location
from model import FloodLSTM

SUPPORTED_LOCATIONS = ["Islamabad", "Quetta", "Swat", "Jhang"]
FORECAST_HORIZON_DAYS = 7


class InferenceError(Exception):
    pass


@lru_cache(maxsize=1)
def _load_model_bundle():
    dyn_scaler_path = os.path.join(MODEL_DIR, "dyn_scaler.pkl")
    stat_scaler_path = os.path.join(MODEL_DIR, "stat_scaler.pkl")
    checkpoint_path = os.path.join(MODEL_DIR, "best_flood_model.pth")

    if not all(os.path.exists(path) for path in (dyn_scaler_path, stat_scaler_path, checkpoint_path)):
        raise InferenceError(
            "Model artifacts not found. Train the model first to populate the models/ directory."
        )

    dyn_scaler = joblib.load(dyn_scaler_path)
    stat_scaler = joblib.load(stat_scaler_path)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = FloodLSTM().to(device)
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=True)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    return {
        "dyn_scaler": dyn_scaler,
        "stat_scaler": stat_scaler,
        "model": model,
        "device": device,
        "threshold": float(checkpoint["best_threshold"]),
    }


def _prepare_location_frame(location: str) -> pd.DataFrame:
    if location not in SUPPORTED_LOCATIONS:
        raise InferenceError(
            f"Unsupported location '{location}'. Choose one of: {', '.join(SUPPORTED_LOCATIONS)}"
        )

    df = process_location(location)
    if df is None or df.empty:
        raise InferenceError(f"No telemetry data available for {location}.")

    df = df.copy()
    df["Date"] = pd.to_datetime(df["Date"]).dt.normalize()
    return df.sort_values("Date").reset_index(drop=True)


def _date_index(df: pd.DataFrame, target_date: str) -> int:
    anchor = pd.Timestamp(target_date).normalize()
    matches = df.index[df["Date"] == anchor].tolist()
    if not matches:
        min_date = df["Date"].min().date()
        max_date = df["Date"].max().date()
        raise InferenceError(
            f"Date {target_date} is not in {min_date} to {max_date} telemetry for this basin."
        )
    return matches[0]


def predict_at_date(location: str, target_date: str, bundle=None, df=None) -> float:
    bundle = bundle or _load_model_bundle()
    df = df if df is not None else _prepare_location_frame(location)

    row_idx = _date_index(df, target_date)
    if row_idx < WINDOW_SIZE:
        raise InferenceError(
            f"Need {WINDOW_SIZE} prior days of telemetry before {target_date} to run inference."
        )

    dynamic_data = bundle["dyn_scaler"].transform(df[DYNAMIC_COLS])
    static_data = bundle["stat_scaler"].transform(df[STATIC_COLS])

    window_start = row_idx - WINDOW_SIZE
    x_dyn = torch.tensor(
        dynamic_data[window_start:row_idx], dtype=torch.float32
    ).unsqueeze(0)
    x_stat = torch.tensor(static_data[row_idx], dtype=torch.float32).unsqueeze(0)

    with torch.no_grad():
        logit = bundle["model"](x_dyn.to(bundle["device"]), x_stat.to(bundle["device"]))
        probability = torch.sigmoid(logit).item()

    return float(probability)


def build_rolling_outlook(location: str, anchor_date: str) -> list[dict]:
    bundle = _load_model_bundle()
    df = _prepare_location_frame(location)
    anchor = pd.Timestamp(anchor_date).normalize()

    outlook = []
    for offset in range(FORECAST_HORIZON_DAYS):
        window_start_date = (anchor + pd.Timedelta(days=offset)).strftime("%Y-%m-%d")
        probability = predict_at_date(location, window_start_date, bundle, df)
        outlook.append(
            {
                "day": offset + 1,
                "date": window_start_date,
                "probability": round(probability * 100, 1),
                "windowDays": FORECAST_HORIZON_DAYS,
            }
        )

    return outlook


def get_inference_payload(location: str, anchor_date: str) -> dict:
    bundle = _load_model_bundle()
    primary_probability = predict_at_date(location, anchor_date)
    rolling_outlook = build_rolling_outlook(location, anchor_date)

    return {
        "location": location,
        "anchorDate": anchor_date,
        "primaryForecast": {
            "date": anchor_date,
            "probability": round(primary_probability * 100, 1),
            "horizonDays": FORECAST_HORIZON_DAYS,
        },
        "forecasts": rolling_outlook,
        "threshold": bundle["threshold"],
        "generatedAt": pd.Timestamp.utcnow().isoformat(),
    }


def run_location_inference(location: str) -> Tuple[pd.DataFrame, float]:
    bundle = _load_model_bundle()
    df = _prepare_location_frame(location)

    dynamic_data = bundle["dyn_scaler"].transform(df[DYNAMIC_COLS])
    static_data = bundle["stat_scaler"].transform(df[STATIC_COLS])

    x_dyn_list, x_stat_list, valid_dates = [], [], []
    for i in range(len(dynamic_data) - WINDOW_SIZE - FORECAST_HORIZON_DAYS):
        x_dyn_list.append(dynamic_data[i : i + WINDOW_SIZE])
        x_stat_list.append(static_data[i + WINDOW_SIZE])
        valid_dates.append(df["Date"].iloc[i + WINDOW_SIZE])

    if not x_dyn_list:
        raise InferenceError(f"Insufficient history to run inference for {location}.")

    x_dyn_tensor = torch.tensor(np.array(x_dyn_list), dtype=torch.float32)
    x_stat_tensor = torch.tensor(np.array(x_stat_list), dtype=torch.float32)

    with torch.no_grad():
        logits = bundle["model"](
            x_dyn_tensor.to(bundle["device"]),
            x_stat_tensor.to(bundle["device"]),
        )
        probs = torch.sigmoid(logits).cpu().numpy()

    results_df = pd.DataFrame(
        {
            "Date": pd.to_datetime(valid_dates),
            "7_Day_Flood_Probability": probs,
        }
    )
    results_df["Flood_Alert"] = (
        results_df["7_Day_Flood_Probability"] >= bundle["threshold"]
    ).astype(int)

    return results_df, bundle["threshold"]


def run_unseen_inference(location="Islamabad"):
    try:
        results_df, threshold = run_location_inference(location)
    except InferenceError as error:
        print(error)
        return

    output_file = f"{location}_inference_results.csv"
    results_df.to_csv(output_file, index=False)
    print(f"Saved {len(results_df)} rows to {output_file}")
    print(f"Threshold: {threshold:.2f} | Alert days: {int(results_df['Flood_Alert'].sum())}")

    top20 = results_df.sort_values("7_Day_Flood_Probability", ascending=False).head(20)
    print(top20[["Date", "7_Day_Flood_Probability", "Flood_Alert"]].to_string(index=False))


if __name__ == "__main__":
    run_unseen_inference("Islamabad")
