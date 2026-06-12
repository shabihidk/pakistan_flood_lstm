import type { AuditDiagnostics, DeepAuditResult } from '../types/audit'
import type { BasinLocation } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export async function fetchQuickAudit(
  location: BasinLocation,
  targetDate: string,
  predictedProbability: number,
): Promise<AuditDiagnostics> {
  const response = await fetch(`${API_BASE_URL}/audit/quick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      target_date: targetDate,
      predicted_probability: predictedProbability,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.success) {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'Quick audit failed.')
  }

  return payload.diagnostics
}

export async function fetchDeepAudit(
  location: BasinLocation,
  targetDate: string,
  predictedProbability: number,
  diagnostics: AuditDiagnostics,
): Promise<DeepAuditResult> {
  const response = await fetch(`${API_BASE_URL}/audit/deep`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      target_date: targetDate,
      predicted_probability: predictedProbability,
      diagnostics,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.success) {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'Deep audit failed.')
  }

  return payload.audit_data
}
