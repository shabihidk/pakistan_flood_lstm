import type {
  AlertLevel,
  BasinLocation,
  DailyForecast,
  FloodInferenceResponse,
  PrimaryForecast,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export function getAlertLevel(probability: number): AlertLevel {
  if (probability > 75) return 'high'
  if (probability >= 40) return 'medium'
  return 'low'
}

export async function fetchFloodInference(
  location: BasinLocation,
  date: string,
): Promise<FloodInferenceResponse> {
  const response = await fetch(`${API_BASE_URL}/inference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location, date }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      typeof payload.error === 'string' ? payload.error : 'Inference request failed.',
    )
  }

  const mapForecast = (
    forecast: Omit<DailyForecast, 'alertLevel'> & { alertLevel?: DailyForecast['alertLevel'] },
  ): DailyForecast => ({
    ...forecast,
    alertLevel: forecast.alertLevel ?? getAlertLevel(forecast.probability),
  })

  const primaryForecast: PrimaryForecast = {
    ...payload.primaryForecast,
    probability: payload.primaryForecast.probability,
  }

  return {
    location: payload.location,
    anchorDate: payload.anchorDate,
    primaryForecast,
    forecasts: payload.forecasts.map(mapForecast),
    generatedAt: payload.generatedAt,
    threshold: payload.threshold,
  }
}

export { API_BASE_URL }
