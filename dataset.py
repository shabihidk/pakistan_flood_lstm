# PyTorch Dataset and DataLoaders
import torch
import numpy as np
from torch.utils.data import Dataset, ConcatDataset, DataLoader
from config import WINDOW_SIZE, BATCH_SIZE, DYNAMIC_COLS, STATIC_COLS, LOCATIONS

class FloodDataset(Dataset):
    def __init__(self, df, dyn_scaler, stat_scaler, window_size=WINDOW_SIZE):
        self.window_size = window_size
        self.dynamic_data = dyn_scaler.transform(df[DYNAMIC_COLS])
        self.static_data = stat_scaler.transform(df[STATIC_COLS])
        self.labels = df['Flood_Label'].values.astype(np.float32)

    def __len__(self):
        return len(self.dynamic_data) - self.window_size

    def __getitem__(self, idx):
        x_dyn = self.dynamic_data[idx:idx+self.window_size]
        x_stat = self.static_data[idx+self.window_size]
        y = self.labels[idx+self.window_size]
        return (torch.tensor(x_dyn, dtype=torch.float32),
                torch.tensor(x_stat, dtype=torch.float32),
                torch.tensor(y, dtype=torch.float32))

def create_dataloaders(train_dfs, val_dfs, dyn_scaler, stat_scaler):
    train_datasets = [FloodDataset(train_dfs[loc], dyn_scaler, stat_scaler) for loc in LOCATIONS]
    val_datasets = [FloodDataset(val_dfs[loc], dyn_scaler, stat_scaler) for loc in LOCATIONS]

    train_loader = DataLoader(ConcatDataset(train_datasets), batch_size=BATCH_SIZE, shuffle=True, num_workers=2, pin_memory=True)
    val_loader = DataLoader(ConcatDataset(val_datasets), batch_size=BATCH_SIZE, shuffle=False, num_workers=2, pin_memory=True)
    
    return train_loader, val_loader