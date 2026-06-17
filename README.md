# Pakistan Flood Prediction using LSTM

A deep learning model for flood prediction across Pakistan using LSTM (Long Short-Term Memory) networks trained on multi-location hydrological and meteorological data.

## Project Overview

This project implements an LSTM-based flood prediction system for three critical flood-prone regions in Pakistan:
- **Swat** - Flash flood prone mountainous valley
- **Jhang** - Riverine flood prone agricultural region  
- **Quetta** - Cloudburst and sudden saturation prone region

## Features

- **Multi-location Training**: Unified model trained across 3 geographically distinct regions
- **Hybrid Labeling**: Combines verified flood events with extreme signal heuristics
- **Location-Specific Heuristics**: Tailored flood detection logic for each region's unique flood characteristics
- **Scalable Architecture**: Dynamic and static feature fusion with bidirectional temporal encoding

## Data Structure

```
data/
├── Dynamic_Swat_2010_2018.csv          # Dynamic features for Swat (historical)
├── Dynamic_Swat_2019_2026.csv          # Dynamic features for Swat (recent)
├── Dynamic_Jhang_2010_2018.csv         # Dynamic features for Jhang
├── Dynamic_Jhang_2019_2026.csv
├── Dynamic_Quetta_2010_2018.csv        # Dynamic features for Quetta
├── Dynamic_Quetta_2019_2026.csv
├── Static_Topography_All_Locations.csv # Elevation, slope data
├── SemiStatic_LULC_Swat_2010_2022.csv  # Land Use/Land Cover
├── SemiStatic_LULC_Jhang_2010_2022.csv
├── SemiStatic_LULC_Quetta_2010_2022.csv
├── SemiStatic_NDVI_Swat_2010_2018.csv  # Vegetation index
├── SemiStatic_NDVI_Swat_2019_2026.csv
├── SemiStatic_NDVI_Jhang_2010_2018.csv
├── SemiStatic_NDVI_Jhang_2019_2026.csv
├── SemiStatic_NDVI_Quetta_2010_2018.csv
└── SemiStatic_NDVI_Quetta_2019_2026.csv
```

## Installation

1. **Clone the repository**:
```bash
git clone https://github.com/shabihidk/pakistan_flood_lstm.git
cd pakistan_flood_lstm
```

2. **Create virtual environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Prepare data**:
   - Place all CSV files in the `data/` folder (see Data Structure above)

## Project Structure

```
flood_prediction/
├── config.py              # Global variables and configurations
├── data_pipeline.py       # Data fusion and feature engineering
├── dataset.py             # PyTorch Dataset and DataLoaders
├── model.py               # LSTM architecture definition
├── train.py               # Training and evaluation loops
├── app.py                 # Main execution script
├── data/                  # CSV data files (not included in repo)
└── models/                # Saved models and scalers (auto-generated)
```

## Configuration

Edit `config.py` to adjust:

```python
LOCATIONS = ["Swat", "Jhang", "Quetta"]
SPLIT_DATE = "2022-01-01"  # Train/validation split
WINDOW_SIZE = 60           # Temporal window for LSTM
BATCH_SIZE = 128
NUM_EPOCHS = 100
EARLY_STOPPING_PATIENCE = 10
```

### Dynamic Features (8)
- precipitation_mm
- rain_3d, rain_7d, rain_14d, rain_30d (rolling precipitation)
- soil_moisture
- temp_2m
- sea_level_pressure

### Static Features (4)
- Mean_Elevation_m
- Mean_Slope_deg
- Dominant_LULC_Class
- NDVI_Mean

## Usage

### Training

Run the complete pipeline:
```bash
python app.py
```

This will:
1. Load and process all CSV files from `data/`
2. Fuse multi-source data (dynamic, static, semi-static)
3. Apply location-specific flood heuristics
4. Split into train/validation sets
5. Train LSTM model with early stopping
6. Save best model and scalers to `models/`

### Output Files

After training, the following files are saved in `models/`:
- `best_flood_model.pth` - Trained LSTM model checkpoint
- `dyn_scaler.pkl` - Dynamic features scaler (for inference)
- `stat_scaler.pkl` - Static features scaler (for inference)

## Model Architecture

### LSTM Component
- Input: 60-step temporal sequences of 8 dynamic features
- Hidden layers: 2 LSTM layers (64 units each)
- Dropout: 0.3 for regularization

### Classification Head
- Concatenates LSTM output with 4 static features
- Dense layers: 128 → 64 → 32 → 1 (binary output)
- Batch normalization and dropout for stability
- Output: Flood probability (sigmoid activation)

## Flood Detection Logic

### Swat (Flash Flood)
- Valley identification (low elevation areas)
- Extreme precipitation in valleys + high temperature
- 7-day accumulated rainfall + high soil saturation

### Jhang (Riverine Flood)
- High soil moisture + 14-day/30-day accumulated rainfall
- Susceptible land-use classes (agricultural areas)
- Multi-day accumulation window (3-day rolling threshold)

### Quetta (Cloudburst)
- Extreme single-day precipitation (99.5th percentile)
- 3-day accumulated precipitation (98th percentile)
- Sudden soil saturation + intense rainfall

## Training Details

- **Loss Function**: BCEWithLogitsLoss with positive class weighting
- **Optimizer**: AdamW (lr=1e-3, weight_decay=1e-4)
- **Learning Rate Schedule**: ReduceLROnPlateau (factor=0.5, patience=3)
- **Evaluation**: Threshold search (0.10-0.90) for optimal F1 score
- **Metrics**: Precision, Recall, F1-score, ROC-AUC, Confusion Matrix

## Results

The model achieves strong performance on validation data with:
- Location-specific threshold optimization
- High recall (minimize missed floods)
- Balanced precision (reduce false alarms)
- ROC-AUC scores > 0.92 across regions

## Verified Flood Events

Training labels are based on documented flood events:
- **Swat**: 5 major events (2010-2022)
- **Jhang**: 4 major events (2013-2022)
- **Quetta**: 3 major events (2011-2022)

## Future Work

- Real-time prediction integration with meteorological APIs
- Ensemble methods (Random Forest + LSTM)
- Transfer learning for similar regions
- Attention mechanisms for feature importance
- Web dashboard for flood risk visualization

## Deploy to Vercel

The dashboard and API deploy together on Vercel. Inference uses **ONNX Runtime** (not PyTorch) so the serverless function stays within size limits.

### One-time: export ONNX artifacts

After training locally:

```bash
pip install -r requirements-train.txt
python scripts/export_onnx.py
```

Commit the inference bundle:

- `models/flood_model.onnx`
- `models/model_meta.json`
- `models/dyn_scaler.pkl`
- `models/stat_scaler.pkl`
- All CSV files under `data/` (see Data Structure)

### Vercel setup

1. Import the GitHub repo in [Vercel](https://vercel.com/new).
2. Leave the default build settings — `vercel.json` at the repo root configures everything.
3. Add **Environment Variables** (Project → Settings → Environment Variables):

| Variable | Required | Notes |
|----------|----------|-------|
| `GEMINI_API_KEY` | For Deep Audit only | Server-side only; never expose to the frontend |
| `GEMINI_MODEL` | Optional | Default: `gemini-2.0-flash` |
| `MODEL_VERSION` | Optional | Shown in audit responses |

4. Deploy. The React app is served from `/` and the Flask API from `/api/*`.

### Local development vs production

| Task | Command |
|------|---------|
| Train model | `pip install -r requirements-train.txt` then `python app.py` |
| Run API locally | `pip install -r requirements.txt` then `python api_server.py` |
| Run frontend | `cd frontend && npm install && npm run dev` |

Local training uses PyTorch; Vercel production uses ONNX automatically when `VERCEL=1`.

## License

MIT License

## Author

Shabih Ul Hassan

## Contact

For questions or collaborations, please open an issue on GitHub.
