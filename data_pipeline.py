import pandas as pd
import numpy as np
import glob
import os
import joblib
from sklearn.preprocessing import StandardScaler
from config import BASE_PATH, LOCATIONS, SPLIT_DATE, DYNAMIC_COLS, STATIC_COLS, MODEL_DIR

FINAL_VERIFIED_EVENTS = {
    "Swat": [("2010-02-08", "2010-02-09"), ("2010-07-28", "2010-08-07"), 
             ("2016-04-01", "2016-04-06"), ("2021-09-11", "2021-09-13"), ("2022-08-22", "2022-08-31")],
    "Jhang": [("2013-08-07", "2013-08-21"), ("2014-09-01", "2014-10-11"), 
              ("2017-06-26", "2017-09-11"), ("2022-08-01", "2022-09-15")],
    "Quetta": [("2011-02-28", "2011-03-04"), ("2013-08-07", "2013-08-21"), ("2022-08-20", "2022-09-05")]
}

def process_location(loc):
    print(f"[PROCESSING] Processing {loc}...")
    dyn_files = glob.glob(os.path.join(BASE_PATH, f"Dynamic_{loc}_*.csv"))
    if not dyn_files:
        print(f"[WARNING] No files found for {loc}")
        return None

    df_dyn = pd.concat([pd.read_csv(f) for f in dyn_files], ignore_index=True)
    df_dyn["Date"] = pd.to_datetime(df_dyn["Date"])
    df_dyn = df_dyn.drop_duplicates(subset=["Date"]).sort_values("Date").reset_index(drop=True)
    
    # Keep all data up to the end of 2025. Completely cut out 2026 to avoid corrupted data.
    df_dyn = df_dyn[df_dyn["Date"].dt.year <= 2025].reset_index(drop=True)

    topo = pd.read_csv(os.path.join(BASE_PATH, "Static_Topography_All_Locations.csv"))
    topo_row = topo[topo["Location"] == loc].iloc[0]

    lulc_files = glob.glob(os.path.join(BASE_PATH, f"SemiStatic_LULC_{loc}_*.csv"))
    df_lulc = pd.concat([pd.read_csv(f) for f in lulc_files])
    df_lulc["Year"] = df_lulc["Year"].astype(int)

    ndvi_files = glob.glob(os.path.join(BASE_PATH, f"SemiStatic_NDVI_{loc}_*.csv"))
    df_ndvi = pd.concat([pd.read_csv(f) for f in ndvi_files])
    df_ndvi["Date"] = pd.to_datetime(df_ndvi["Date"])

    df_dyn["Year"] = df_dyn["Date"].dt.year
    df_dyn = df_dyn.merge(df_lulc[["Year", "Dominant_LULC_Class"]], on="Year", how="left")
    df_dyn["Dominant_LULC_Class"] = df_dyn["Dominant_LULC_Class"].ffill().bfill()
    
    df_dyn["Mean_Elevation_m"] = topo_row["Mean_Elevation_m"]
    df_dyn["Mean_Slope_deg"] = topo_row["Mean_Slope_deg"]

    df_dyn = df_dyn.merge(df_ndvi[["Date", "NDVI_Mean"]], on="Date", how="left")
    df_dyn["NDVI_Mean"] = df_dyn["NDVI_Mean"].replace(0, np.nan)
    df_dyn = df_dyn.set_index("Date")
    df_dyn["NDVI_Mean"] = df_dyn["NDVI_Mean"].interpolate(method="time").bfill().ffill()
    df_dyn = df_dyn.reset_index()

    df_dyn["temp_2m"] = df_dyn["temp_2m"].replace(0, np.nan).interpolate() - 273.15
    df_dyn["soil_moisture"] = df_dyn["soil_moisture"].replace(0, np.nan).interpolate().bfill().ffill()
    df_dyn["sea_level_pressure"] = df_dyn["sea_level_pressure"].replace(0, np.nan).interpolate().bfill().ffill()

    df_dyn["rain_3d"] = df_dyn["precipitation_mm"].rolling(3, min_periods=1).sum()
    df_dyn["rain_7d"] = df_dyn["precipitation_mm"].rolling(7, min_periods=1).sum()
    df_dyn["rain_14d"] = df_dyn["precipitation_mm"].rolling(14, min_periods=1).sum()
    df_dyn["rain_30d"] = df_dyn["precipitation_mm"].rolling(30, min_periods=1).sum()

    return df_dyn.drop(columns=["Year", ".geo", "system:index"], errors="ignore")

def generate_labels(master_dfs):
    labeled_dfs = {}
    for city in LOCATIONS:
        df = master_dfs[city].copy()
        df["Verified_Event_Label"] = 0
        
        for start_date, end_date in FINAL_VERIFIED_EVENTS[city]:
            mask = (df["Date"] >= pd.Timestamp(start_date)) & (df["Date"] <= pd.Timestamp(end_date))
            df.loc[mask, "Verified_Event_Label"] = 1

        extreme_signal = np.zeros(len(df))
        p995_rain = df["precipitation_mm"].quantile(0.995)
        p95_rain3 = df["rain_3d"].quantile(0.95)
        p95_rain7 = df["rain_7d"].quantile(0.95)
        p95_rain14 = df["rain_14d"].quantile(0.95)
        p90_soil = df["soil_moisture"].quantile(0.90)
        p80_soil = df["soil_moisture"].quantile(0.80)

        if city == "Swat":
            is_valley = (df["Mean_Elevation_m"] <= df["Mean_Elevation_m"].quantile(0.35))
            swat_flash = (df["precipitation_mm"] >= p995_rain) & is_valley
            high_temp = df["temp_2m"] >= df["temp_2m"].quantile(0.70)
            swat_saturation = (df["rain_7d"] >= p95_rain7) & (df["soil_moisture"] >= p80_soil) & high_temp & is_valley
            combined_heuristic = (swat_flash | swat_saturation).astype(int)
            extreme_signal = (combined_heuristic.rolling(window=2, min_periods=1).sum() >= 2).astype(int)

        elif city == "Jhang":
            jhang_riverine = ((df["soil_moisture"] >= p90_soil) & 
                              ((df["rain_14d"] >= p95_rain14) | (df["rain_30d"] >= df["rain_30d"].quantile(0.95))))
            is_susceptible_lulc = df["Dominant_LULC_Class"].round().astype(int).isin([12, 16])
            jhang_total_hazard = (jhang_riverine & is_susceptible_lulc).astype(int)
            extreme_signal = (jhang_total_hazard.rolling(window=3, min_periods=1).sum() >= 2).astype(int)

        elif city == "Quetta":
            quetta_cloudburst = (df["precipitation_mm"] >= p995_rain) | (df["rain_3d"] >= df["rain_3d"].quantile(0.98))
            quetta_sudden_saturation = (df["rain_3d"] >= p95_rain3) & (df["soil_moisture"] >= p80_soil)
            extreme_signal = (quetta_cloudburst | quetta_sudden_saturation).astype(int)

        df["Extreme_Flood_Signal"] = extreme_signal
        df["Flood_Label"] = np.maximum(df["Verified_Event_Label"], df["Extreme_Flood_Signal"])
        labeled_dfs[city] = df
    return labeled_dfs

def prepare_data():
    master_dfs = {loc: process_location(loc) for loc in LOCATIONS if process_location(loc) is not None}
    labeled_dfs = generate_labels(master_dfs)

    train_dfs, val_dfs = {}, {}
    for loc in LOCATIONS:
        df = labeled_dfs[loc]
        train_dfs[loc] = df[df['Date'] < SPLIT_DATE].reset_index(drop=True)
        val_dfs[loc] = df[df['Date'] >= SPLIT_DATE].reset_index(drop=True)

    train_df_combined = pd.concat(list(train_dfs.values()))
    
    dyn_scaler = StandardScaler().fit(train_df_combined[DYNAMIC_COLS])
    stat_scaler = StandardScaler().fit(train_df_combined[STATIC_COLS])

    # Save scalers for production/inference
    joblib.dump(dyn_scaler, os.path.join(MODEL_DIR, 'dyn_scaler.pkl'))
    joblib.dump(stat_scaler, os.path.join(MODEL_DIR, 'stat_scaler.pkl'))

    return train_dfs, val_dfs, dyn_scaler, stat_scaler