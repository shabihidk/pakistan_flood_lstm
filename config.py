import os

# Use absolute path based on config.py location
BASE_PATH = os.path.join(os.path.dirname(__file__), 'data')
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

# Ensure model directory exists
os.makedirs(MODEL_DIR, exist_ok=True)

# Verify data directory exists
if not os.path.exists(BASE_PATH):
    raise FileNotFoundError(f"Data directory not found: {BASE_PATH}")

LOCATIONS = ["Swat", "Jhang", "Quetta"]
SPLIT_DATE = "2022-01-01"

DYNAMIC_COLS = [
    'precipitation_mm', 'rain_3d', 'rain_7d', 'rain_14d', 
    'rain_30d', 'soil_moisture', 'temp_2m', 'sea_level_pressure'
]

STATIC_COLS = [
    'Mean_Elevation_m', 'Mean_Slope_deg', 'Dominant_LULC_Class', 'NDVI_Mean'
]

WINDOW_SIZE = 60
BATCH_SIZE = 128
NUM_EPOCHS = 100
EARLY_STOPPING_PATIENCE = 10