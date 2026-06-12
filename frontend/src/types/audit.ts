export interface AuditDiagnostics {
  telemetry_reliability_score?: number
  prediction_residual?: number
  expected_physics_risk?: number
  heuristic_findings?: string[]
  rain_missing_pct?: number
  soil_missing_pct?: number
  max_telemetry_gap_days?: number
  rolling_14d_rain_peak?: number
  soil_moisture_peak?: number
  error?: string
}

export interface AuditSource {
  title: string
  url: string
  date?: string
}

export interface DeepAuditResult {
  impact_classification?: string
  confidence?: string
  summary: string
  evidence?: string
  sources: AuditSource[]
  provenance: string
  assessment?: string
  final_assessment?: string
  confidence_reason?: string
  prediction_residual?: number
  telemetry_score?: number
  generated_at?: string
  model_version?: string
  error?: string
  search_window?: {
    start: string
    end: string
  }
}
