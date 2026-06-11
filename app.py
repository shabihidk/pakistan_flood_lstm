import torch
import torch.nn as nn
import numpy as np
from data_pipeline import prepare_data
from dataset import create_dataloaders
from model import FloodLSTM
from train import train_model, evaluate_model
from config import LOCATIONS


def main():
    print("[START] Starting Flood Prediction Pipeline...")

    train_dfs, val_dfs, dyn_scaler, stat_scaler = prepare_data()
    train_loader, val_loader = create_dataloaders(train_dfs, val_dfs, dyn_scaler, stat_scaler)

    all_labels = np.concatenate([train_dfs[loc]["Target_7Day"] for loc in LOCATIONS])
    num_pos, num_neg = np.sum(all_labels == 1), np.sum(all_labels == 0)
    pos_weight = min(num_neg / num_pos, 27)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[DEVICE] Using device: {device}")

    model = FloodLSTM().to(device)
    criterion = nn.BCEWithLogitsLoss(
        pos_weight=torch.tensor([pos_weight], dtype=torch.float32, device=device)
    )
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="max", factor=0.5, patience=3
    )

    model_path = train_model(model, train_loader, val_loader, criterion, optimizer, scheduler, device)
    evaluate_model(model, val_loader, device, model_path)


if __name__ == "__main__":
    main()
