export type BasinLocation = 'Islamabad' | 'Quetta' | 'Swat' | 'Jhang'

export type AlertLevel = 'low' | 'medium' | 'high'

export interface BasinMarker {
  id: BasinLocation
  name: BasinLocation
  coordinates: [number, number]
  lat: number
  lng: number
}

export interface DailyForecast {
  day: number
  date: string
  probability: number
  alertLevel: AlertLevel
  windowDays?: number
}

export interface PrimaryForecast {
  date: string
  probability: number
  horizonDays: number
}

export interface FloodInferenceResponse {
  location: BasinLocation
  anchorDate: string
  primaryForecast: PrimaryForecast
  forecasts: DailyForecast[]
  generatedAt: string
  threshold?: number
}

export interface ModelMetrics {
  architecture: string
  forecastHorizon: string
  f1Score: number
  rocAuc: number
  recall: number
}
