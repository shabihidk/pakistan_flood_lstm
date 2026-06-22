export type AlertLevel = 'low' | 'moderate' | 'high' | 'very_high';

export interface DailyForecast {
  day: number;
  date: string;
  probability: number;
  alert_level: AlertLevel;
  inferenceAnchor: string;
  windowDays?: number;
}

export interface PrimaryForecast {
  date: string;
  probability: number;
  alert_level: AlertLevel;
  horizonDays: number;
}

export interface InferenceResponse {
  admin_id: string;
  anchorDate: string;
  primaryForecast: PrimaryForecast;
  forecasts: DailyForecast[];
  threshold: number;
  model_version: string;
  generatedAt: string;
  source: string;
}
