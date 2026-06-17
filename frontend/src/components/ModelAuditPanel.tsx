import { useEffect, useState } from 'react'
import { Activity, AlertCircle, ExternalLink, Search, ShieldCheck } from 'lucide-react'
import { fetchDeepAudit } from '../services/auditService'
import { cn } from '../lib/utils'
import type { AuditDiagnostics, DeepAuditResult } from '../types/audit'
import type { BasinLocation } from '../types'

interface ModelAuditPanelProps {
  location: BasinLocation
  targetDate: string
  predictedProb: number
  diagnostics: AuditDiagnostics | null
}

export function ModelAuditPanel({
  location,
  targetDate,
  predictedProb,
  diagnostics,
}: ModelAuditPanelProps) {
  const [deepAudit, setDeepAudit] = useState<DeepAuditResult | null>(null)
  const [isAuditing, setIsAuditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDeepAudit(null)
    setError(null)
    setIsAuditing(false)
  }, [location, targetDate, predictedProb, diagnostics])

  const runDeepValidation = async () => {
    if (!diagnostics) return

    setIsAuditing(true)
    setError(null)
    setDeepAudit(null)

    try {
      const result = await fetchDeepAudit(location, targetDate, predictedProb, diagnostics)
      if (result.error) {
        setError(result.error)
        return
      }
      setDeepAudit(result)
    } catch (auditError) {
      setError(auditError instanceof Error ? auditError.message : 'Network timeout or server error.')
    } finally {
      setIsAuditing(false)
    }
  }

  if (!diagnostics) {
    return (
      <div className="dashboard-card p-4 text-sm text-slate-500">
        Run inference to enable grounded validation.
      </div>
    )
  }

  if (diagnostics.error) {
    return (
      <div className="dashboard-card border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {diagnostics.error}
      </div>
    )
  }

  const residual = diagnostics.prediction_residual ?? 0
  const residualPct = residual * 100

  return (
    <div className="dashboard-card space-y-4 p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center text-sm font-semibold text-slate-900">
            <ShieldCheck className="mr-2 h-4 w-4 text-teal-700" />
            Grounded Evidence
          </h3>
          {deepAudit?.search_window && (
            <span className="text-[11px] text-slate-500">
              {deepAudit.search_window.start} → {deepAudit.search_window.end}
            </span>
          )}
        </div>

        {!isAuditing && (
          <button
            type="button"
            onClick={() => void runDeepValidation()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-sm font-medium text-teal-800 transition-colors hover:bg-teal-50"
          >
            <Search className="h-4 w-4" />
            <span>{deepAudit ? 'Run Again' : 'Run Grounded Validation (LLM)'}</span>
          </button>
        )}

        {isAuditing && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-teal-800">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-300 border-t-teal-700" />
            Retrieving evidence...
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {deepAudit && (
          <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-sm leading-relaxed text-slate-700">{deepAudit.summary}</p>

            {deepAudit.sources?.length > 0 && (
              <ul className="max-h-40 space-y-1.5 overflow-y-auto">
                {deepAudit.sources.map((source, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs">
                    <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-teal-700" />
                    <div className="min-w-0">
                      {source.url === 'local' ? (
                        <span className="text-slate-700">{source.title}</span>
                      ) : (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-800 hover:underline"
                        >
                          {source.title}
                        </a>
                      )}
                      {source.date && <span className="ml-1 text-slate-400">({source.date})</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              {deepAudit.provenance.replace(/_/g, ' ')}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-700" />
            <h3 className="text-sm font-semibold text-slate-900">Telemetry Diagnostics</h3>
          </div>
          <span className="text-xs text-slate-500">
            Residual{' '}
            <strong
              className={Math.abs(residual) > 0.4 ? 'text-red-700' : 'text-slate-800'}
            >
              {residualPct > 0 ? '+' : ''}
              {residualPct.toFixed(0)}%
            </strong>
          </span>
        </div>

        {diagnostics.heuristic_findings?.map((finding, index) => (
          <div
            key={index}
            className={cn(
              'rounded-lg border px-2.5 py-2 text-xs',
              finding.includes('❌') || finding.includes('⚠️')
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-slate-200 bg-slate-50 text-slate-700',
            )}
          >
            {finding}
          </div>
        ))}
      </div>
    </div>
  )
}
