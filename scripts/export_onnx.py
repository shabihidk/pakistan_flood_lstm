"""Export trained PyTorch checkpoint to ONNX for serverless deployment."""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import torch

from config import MODEL_DIR, WINDOW_SIZE
from model import FloodLSTM


def export_onnx(checkpoint_path=None):
    checkpoint_path = checkpoint_path or os.path.join(MODEL_DIR, "best_flood_model.pth")
    onnx_path = os.path.join(MODEL_DIR, "flood_model.onnx")
    meta_path = os.path.join(MODEL_DIR, "model_meta.json")

    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint not found: {checkpoint_path}")

    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    model = FloodLSTM()
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    dummy_dyn = torch.randn(1, WINDOW_SIZE, 8)
    dummy_stat = torch.randn(1, 4)

    torch.onnx.export(
        model,
        (dummy_dyn, dummy_stat),
        onnx_path,
        input_names=["x_dyn", "x_stat"],
        output_names=["logits"],
        dynamic_axes={
            "x_dyn": {0: "batch"},
            "x_stat": {0: "batch"},
            "logits": {0: "batch"},
        },
        opset_version=17,
        dynamo=False,
    )

    meta = {
        "best_threshold": float(checkpoint.get("best_threshold", 0.5)),
        "best_f1": float(checkpoint.get("best_f1", 0.0)),
        "window_size": WINDOW_SIZE,
        "backend": "onnx",
    }
    with open(meta_path, "w", encoding="utf-8") as handle:
        json.dump(meta, handle, indent=2)

    print(f"Exported ONNX model to {onnx_path}")
    print(f"Wrote metadata to {meta_path}")


if __name__ == "__main__":
    export_onnx()
