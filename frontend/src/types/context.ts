export interface ContextSummary {
  days: number;
  anchor_date: string;
  from: string;
  to: string;
  admin_count: number;
  sample_count: number;
  averages: {
    precipitation_mm?: number | null;
    soil_moisture?: number | null;
    temp_2m_c?: number | null;
    runoff_mm?: number | null;
    surface_pressure_pa?: number | null;
  };
}

export type InferenceScope = 'district' | 'province';
