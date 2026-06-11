# LSTM architecture definition
import torch
import torch.nn as nn

class FloodLSTM(nn.Module):
    def __init__(self, dynamic_input_size=8, static_input_size=4, hidden_size=64, num_layers=2, dropout=0.3):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=dynamic_input_size, hidden_size=hidden_size, 
            num_layers=num_layers, batch_first=True, dropout=dropout
        )
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size + static_input_size, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 1)
        )

    def forward(self, x_dyn, x_stat):
        _, (hidden, _) = self.lstm(x_dyn)
        temporal_features = hidden[-1]
        combined_features = torch.cat([temporal_features, x_stat], dim=1)
        logits = self.classifier(combined_features)
        return logits.squeeze(1)