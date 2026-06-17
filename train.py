# Training and evaluation loops
import torch
import numpy as np
import os
from tqdm import tqdm
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, classification_report
from config import NUM_EPOCHS, EARLY_STOPPING_PATIENCE, MODEL_DIR

def train_model(model, train_loader, val_loader, criterion, optimizer, scheduler, device):
    best_f1 = 0.0
    best_threshold = 0.5
    epochs_without_improvement = 0
    model_path = os.path.join(MODEL_DIR, "best_flood_model.pth")

    for epoch in range(NUM_EPOCHS):
        model.train()
        running_loss = 0.0
        progress_bar = tqdm(train_loader, desc=f"Epoch {epoch+1}/{NUM_EPOCHS}")

        for x_dyn, x_stat, y in progress_bar:
            x_dyn, x_stat, y = x_dyn.to(device), x_stat.to(device), y.to(device)
            optimizer.zero_grad()
            logits = model(x_dyn, x_stat)
            loss = criterion(logits, y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            running_loss += loss.item()
            progress_bar.set_postfix(loss=f"{loss.item():.4f}")

        train_loss = running_loss / len(train_loader)
        
        # Validation Phase
        model.eval()
        val_probs, val_targets = [], []
        with torch.no_grad():
            for x_dyn, x_stat, y in val_loader:
                x_dyn, x_stat = x_dyn.to(device), x_stat.to(device)
                logits = model(x_dyn, x_stat)
                probs = torch.sigmoid(logits)
                val_probs.extend(probs.cpu().numpy())
                val_targets.extend(y.numpy())

        val_probs = np.array(val_probs)
        val_targets = np.array(val_targets)

        # Threshold Search
        thresholds = np.arange(0.10, 0.91, 0.01)
        epoch_best_f1, epoch_best_threshold = 0.0, 0.50
        for threshold in thresholds:
            preds = (val_probs >= threshold).astype(int)
            current_f1 = f1_score(val_targets, preds, zero_division=0)
            if current_f1 > epoch_best_f1:
                epoch_best_f1 = current_f1
                epoch_best_threshold = threshold

        val_preds = (val_probs >= epoch_best_threshold).astype(int)
        precision = precision_score(val_targets, val_preds, zero_division=0)
        recall = recall_score(val_targets, val_preds, zero_division=0)
        auc = roc_auc_score(val_targets, val_probs)

        scheduler.step(epoch_best_f1)
        current_lr = optimizer.param_groups[0]["lr"]

        print(f"\n[Epoch {epoch+1}] Loss: {train_loss:.4f} | F1: {epoch_best_f1:.4f} | AUC: {auc:.4f} | Thresh: {epoch_best_threshold:.2f} | LR: {current_lr:.6f}")

        if epoch_best_f1 > best_f1:
            best_f1 = epoch_best_f1
            best_threshold = epoch_best_threshold
            epochs_without_improvement = 0
            torch.save({"model_state_dict": model.state_dict(), "best_threshold": float(best_threshold), "best_f1": float(best_f1)}, model_path)
            print("[SUCCESS] New best model saved.")
        else:
            epochs_without_improvement += 1
            if epochs_without_improvement >= EARLY_STOPPING_PATIENCE:
                print("[STOP] Early stopping triggered.")
                break
    
    return model_path

def evaluate_model(model, val_loader, device, model_path):
    checkpoint = torch.load(model_path, map_location=device, weights_only=True)
    model.load_state_dict(checkpoint["model_state_dict"])
    best_threshold = checkpoint["best_threshold"]

    model.eval()
    all_probs, all_labels = [], []
    with torch.no_grad():
        for x_dyn, x_stat, y in val_loader:
            logits = model(x_dyn.to(device), x_stat.to(device))
            all_probs.extend(torch.sigmoid(logits).cpu().numpy())
            all_labels.extend(y.numpy())

    all_probs = np.array(all_probs)
    all_labels = np.array(all_labels)
    all_preds = (all_probs >= best_threshold).astype(int)

    print("\n===== FINAL VALIDATION RESULTS =====")
    print(f"Threshold Used: {best_threshold:.2f}")
    print(classification_report(all_labels, all_preds, digits=4))
    print("Confusion Matrix:\n", confusion_matrix(all_labels, all_preds))

    try:
        import subprocess
        import sys

        export_script = os.path.join(os.path.dirname(__file__), "scripts", "export_onnx.py")
        result = subprocess.run(
            [sys.executable, export_script],
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            print(result.stdout.strip())
        else:
            detail = result.stderr.strip() or result.stdout.strip()
            print(f"[WARN] ONNX export skipped: {detail}")
    except Exception as error:
        print(f"[WARN] ONNX export skipped: {error}")