import { AlertTriangle, Droplets, LayoutGrid, Radio } from 'lucide-react'
import { BASIN_MARKERS } from '../constants/basins'
import { cn } from '../lib/utils'
import type { BasinLocation, DailyForecast, PrimaryForecast } from '../types'
import { Card, CardContent, CardHeader } from './ui/Card'

interface SituationPanelProps {
  activeBasin: BasinLocation | null
  primaryForecast: PrimaryForecast | null
  forecasts: DailyForecast[] | null
  isLoading: boolean
}

export function SituationPanel({
  activeBasin,
  primaryForecast,
  forecasts,
  isLoading,
}: SituationPanelProps) {
  const highAlerts = forecasts?.filter((forecast) => forecast.alertLevel === 'high').length ?? 0
  const activeMarker = BASIN_MARKERS.find((marker) => marker.id === activeBasin)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Situation" subtitle="Live overview" icon={<Radio className="h-4 w-4" />} />
        <CardContent className="space-y-3">
          <SituationCard
            title="High-Risk Windows"
            value={`${String(highAlerts).padStart(2, '0')} / 07`}
            caption="Rolling 7-day windows above high alert"
            icon={<AlertTriangle className="h-5 w-5" />}
            accent="orange"
            loading={isLoading}
          />

          <SituationCard
            title="Primary Forecast"
            value={
              primaryForecast
                ? `${primaryForecast.probability}%`
                : isLoading
                  ? '...'
                  : '--'
            }
            caption={
              primaryForecast
                ? `${activeBasin ?? 'Basin'} · next ${primaryForecast.horizonDays} days from anchor`
                : 'Run inference to view model output'
            }
            icon={<Droplets className="h-5 w-5" />}
            accent="teal"
            loading={isLoading}
          />

          <SituationCard
            title="Structure"
            value={activeBasin ?? 'No basin'}
            caption={
              activeMarker
                ? `${activeMarker.lat.toFixed(2)}°N, ${activeMarker.lng.toFixed(2)}°E`
                : 'Select a monitoring station'
            }
            icon={<LayoutGrid className="h-5 w-5" />}
            accent="slate"
            loading={false}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Stations Network
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{BASIN_MARKERS.length} Sites</p>
          </div>
          <div className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
            Pakistan
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface SituationCardProps {
  title: string
  value: string
  caption: string
  icon: React.ReactNode
  accent: 'orange' | 'teal' | 'slate'
  loading: boolean
}

function SituationCard({ title, value, caption, icon, accent, loading }: SituationCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-left">
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
          accent === 'orange' && 'bg-orange-100 text-orange-600',
          accent === 'teal' && 'bg-teal-100 text-teal-700',
          accent === 'slate' && 'bg-slate-200 text-slate-700',
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {title}
        </p>
        <p className={cn('mt-1 text-xl font-bold text-slate-900', loading && 'animate-pulse')}>
          {value}
        </p>
        <p className="mt-1 text-xs text-slate-500">{caption}</p>
      </div>
    </div>
  )
}
