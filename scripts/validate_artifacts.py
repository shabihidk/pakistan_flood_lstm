#!/usr/bin/env python3
"""Validate flood_lstm_v4 artifact files and optional forward pass."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = Path(__import__("os").environ.get("MODEL_DIR", ROOT / "models" / "flood_lstm_v4"))


def main() -> int:
    errors: list[str] = []
    required = [
        "model_meta.json",
        "model_definition.py",
        "dynamic_scaler.joblib",
        "static_scaler.joblib",
    ]
    checkpoint_any = [
        "flood_lstm_v4_csv_supabase_final.pth",
        "best_flood_lstm.pth",
    ]

    print(f"Model dir: {MODEL_DIR}")
    if not MODEL_DIR.is_dir():
        errors.append(f"Missing directory: {MODEL_DIR}")
    else:
        for name in required:
            path = MODEL_DIR / name
            print(f"  {'OK' if path.exists() else 'MISSING':>7}  {name}")
            if not path.exists():
                errors.append(f"Missing {name}")

        ckpt = next((MODEL_DIR / n for n in checkpoint_any if (MODEL_DIR / n).exists()), None)
        if ckpt:
            print(f"     OK  {ckpt.name}")
        else:
            errors.append("Missing checkpoint (.pth) — copy from Colab artifacts")

    meta_path = MODEL_DIR / "model_meta.json"
    if meta_path.exists():
        with open(meta_path, encoding="utf-8") as handle:
            meta = json.load(handle)
        for key in (
            "dynamic_cols",
            "static_cols",
            "window_size",
            "horizon_days",
            "model_version",
            "best_threshold",
            "target_col",
        ):
            if key not in meta:
                errors.append(f"model_meta.json missing key: {key}")
            else:
                print(f"  meta.{key} = {meta[key] if key not in ('dynamic_cols', 'static_cols') else f'[{len(meta[key])} cols]'}")

    if errors:
        print("\nValidation FAILED:")
        for err in errors:
            print(f"  - {err}")
        return 1

    try:
        import torch
        import joblib
        import importlib.util

        spec = importlib.util.spec_from_file_location(
            "md", MODEL_DIR / "model_definition.py"
        )
        module = importlib.util.module_from_spec(spec)
        assert spec and spec.loader
        spec.loader.exec_module(module)

        with open(meta_path, encoding="utf-8") as handle:
            meta = json.load(handle)

        model = module.FloodLSTM(
            meta["dynamic_input_size"],
            meta["static_input_size"],
            meta["hidden_size"],
            meta["num_layers"],
            meta["dropout"],
        )
        ckpt_path = next(MODEL_DIR / n for n in checkpoint_any if (MODEL_DIR / n).exists())
        ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
        model.load_state_dict(ckpt.get("model_state_dict", ckpt))
        model.eval()

        dyn_scaler = joblib.load(MODEL_DIR / "dynamic_scaler.joblib")
        stat_scaler = joblib.load(MODEL_DIR / "static_scaler.joblib")
        print(f"\nScalers loaded: dynamic {dyn_scaler.n_features_in_}, static {stat_scaler.n_features_in_}")

        import numpy as np

        w = meta["window_size"]
        x_dyn = np.zeros((1, w, meta["dynamic_input_size"]), dtype=np.float32)
        x_stat = np.zeros((1, meta["static_input_size"]), dtype=np.float32)
        with torch.no_grad():
            out = model(torch.tensor(x_dyn), torch.tensor(x_stat))
        print(f"Forward pass OK: logit shape {tuple(out.shape)}")
    except Exception as exc:
        print(f"\nLoad/forward check FAILED: {exc}", file=sys.stderr)
        return 1

    print("\nValidation PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
