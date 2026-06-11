import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CloudRain } from 'lucide-react'
import { formatDisplayDate, cn } from '../lib/utils'
import type { DailyForecast, PrimaryForecast } from '../types'
import { Card, CardContent, CardHeader } from './ui/Card'

interface ForecastTimelineProps {
  primaryForecast: PrimaryForecast | null
  forecasts: DailyForecast[] | null
  isLoading: boolean
  locationLabel?: string
}

const ALERT_STYLES = {
  low: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    label: 'Low Alert',
    ring: 'ring-emerald-100',
    bar: '#10b981',
  },
  medium: {
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    label: 'Medium Alert',
    ring: 'ring-amber-100',
    bar: '#f59e0b',
  },
  high: {
    badge: 'border-red-200 bg-red-50 text-red-700 pulse-alert',
    label: 'High Alert',
    ring: 'ring-red-100',
    bar: '#ef4444',
  },
} as const

function alertLevelForProbability(probability: number) {
  if (probability > 75) return ALERT_STYLES.high
  if (probability >= 40) return ALERT_STYLES.medium
  return ALERT_STYLES.low
}

function PrimaryForecastCard({ forecast }: { forecast: PrimaryForecast }) {
  const styles = alertLevelForProbability(forecast.probability)

  return (
    <div
      className={cn(
        'rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-left ring-1 ring-teal-100',
        forecast.probability > 75 && 'pulse-alert border-red-200 bg-red-50/70 ring-red-100',
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-800">
        Primary forecast
      </p>
      <p className="mt-1 text-xs text-slate-600">
        Flood risk for the next {forecast.horizonDays} days after {formatDisplayDate(forecast.date)}
      </p>
      <p className="mt-3 font-mono text-4xl font-bold text-slate-900">
        {forecast.probability}
        <span className="ml-1 text-lg font-medium text-slate-500">%</span>
      </p>
      <span
        className={cn(
          'mt-3 inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
          styles.badge,
        )}
      >
        {styles.label}
      </span>
    </div>
  )
}

function RollingOutlookCard({ forecast }: { forecast: DailyForecast }) {
  const styles = ALERT_STYLES[forecast.alertLevel]

  return (
    <article
      className={cn(
        'min-w-[118px] flex-1 rounded-xl border border-slate-200 bg-white p-3 text-left ring-1',
        styles.ring,
        forecast.alertLevel === 'high' && 'pulse-alert',
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        Week from
      </p>
      <p className="mt-1 text-[11px] font-medium text-slate-700">
        {formatDisplayDate(forecast.date)}
      </p>
      <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
        {forecast.probability}
        <span className="ml-1 text-sm font-medium text-slate-400">%</span>
      </p>
      <p className="mt-1 text-[10px] text-slate-500">Next {forecast.windowDays ?? 7}-day window</p>
    </article>
  )
}

export function ForecastTimeline({
  primaryForecast,
  forecasts,
  isLoading,
  locationLabel,
}: ForecastTimelineProps) {
  const chartData =
    forecasts?.map((forecast) => ({
      label: formatDisplayDate(forecast.date).replace(',', ''),
      probability: forecast.probability,
    })) ?? []

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="7-Day Outlook"
        subtitle={
          locationLabel
            ? `LSTM output for ${locationLabel} — one score per week-long window`
            : 'Select a basin and run inference'
        }
        icon={<CloudRain className="h-4 w-4" />}
      />

      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-teal-200 bg-teal-50/40 py-10">
            <div className="flex flex-col items-center gap-3 text-sm text-teal-800">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-teal-300 border-t-teal-700" />
              Running model forward pass...
            </div>
          </div>
        )}

        {!isLoading && !forecasts && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-sm text-slate-500">
            Each result is a live LSTM prediction from historical CSV telemetry, not hardcoded values.
          </div>
        )}

        {!isLoading && primaryForecast && forecasts && (
          <>
            <PrimaryForecastCard forecast={primaryForecast} />

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Rolling windows
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {forecasts.map((forecast) => (
                  <RollingOutlookCard key={forecast.date} forecast={forecast} />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="probabilityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.75rem',
                        color: '#0f172a',
                      }}
                      formatter={(value) => [`${value}%`, '7-day window risk']}
                    />
                    <Area
                      type="monotone"
                      dataKey="probability"
                      stroke="#0f766e"
                      strokeWidth={2}
                      fill="url(#probabilityGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
