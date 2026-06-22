export type AlertLevel = 'low' | 'moderate' | 'high' | 'very_high';

export interface AdminUnit {
  admin_id: string;
  name: string;
  level: string;
  parent_id?: string | null;
  province?: string | null;
  district?: string | null;
  tehsil?: string | null;
  hydro_region?: string | null;
  area_km2?: number | null;
  lat?: number | null;
  lon?: number | null;
}

export interface LstmPrediction {
  admin_id: string;
  forecast_date: string;
  horizon_days: number;
  model_version: string;
  probability: number;
  alert_level: AlertLevel;
  threshold: number;
  source: string;
}

export interface DailyFeature {
  admin_id: string;
  date: string;
  precipitation_mm?: number | null;
  soil_moisture?: number | null;
  temp_2m_c?: number | null;
  dewpoint_2m_c?: number | null;
  runoff_mm?: number | null;
  wind10m_ms?: number | null;
  surface_pressure_pa?: number | null;
  source?: string | null;
}

export interface StaticFeature {
  admin_id: string;
  elevation_mean_m?: number | null;
  slope_mean_deg?: number | null;
  relief_m?: number | null;
  lulc_water_frac?: number | null;
  lulc_crop_frac?: number | null;
  lulc_built_frac?: number | null;
  source?: string | null;
}

export interface DistrictSelection {
  adminId: string;
  name: string;
  province: string;
}
