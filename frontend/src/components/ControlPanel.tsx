import { AlertCircle, Map, Play, Radar } from 'lucide-react'
import { cn } from '../lib/utils'
import type { BasinLocation } from '../types'
import { Button } from './ui/Button'
import { Card, CardContent, CardHeader } from './ui/Card'
import { DatePicker } from './ui/DatePicker'

interface ControlPanelProps {
  selectedDate: string
  onDateChange: (date: string) => void
  activeBasin: BasinLocation | null
  onRunPrediction: () => void
  isLoading: boolean
  error?: string | null
}

export function ControlPanel({
  selectedDate,
  onDateChange,
  activeBasin,
  onRunPrediction,
  isLoading,
  error,
}: ControlPanelProps) {
  const canRun = Boolean(activeBasin) && !isLoading

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Flood Intelligence Dashboard"
          subtitle="Live monitoring & historical analysis — Pakistan"
          icon={<Map className="h-4 w-4" />}
        />
        <CardContent>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
            <Radar className="h-3.5 w-3.5" />
            LIVE MAP
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Inference Control"
          subtitle="Select an anchor date and run the LSTM forecast"
          icon={<Radar className="h-4 w-4" />}
        />

        <CardContent className="space-y-4">
          <div className="space-y-2 text-left">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Anchor Date
            </label>
            <DatePicker
              value={selectedDate}
              onChange={onDateChange}
              max={new Date().toISOString().slice(0, 10)}
              disabled={isLoading}
            />
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Active Basin
            </p>
            <p className="mt-1 text-sm font-semibold text-teal-800">
              {activeBasin ?? 'Select a marker on the map'}
            </p>
          </div>

          <Button
            className="w-full"
            variant="orange"
            onClick={onRunPrediction}
            loading={isLoading}
            disabled={!canRun}
          >
            {!isLoading && <Play className="h-4 w-4" />}
            {isLoading ? 'Running Prediction...' : 'Run Prediction'}
          </Button>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div
            className={cn(
              'rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left text-xs leading-relaxed text-slate-500',
              isLoading && 'border-teal-200 bg-teal-50 text-teal-800',
            )}
          >
            {isLoading
              ? 'Processing the 60-day telemetry window and generating 7-day probabilities...'
              : 'Marker clicks auto-run inference. Use Run Prediction to refresh the selected date.'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
