import { BrainCircuit, Gauge, Target } from 'lucide-react'
import { MODEL_METRICS } from '../constants/basins'
import { Card, CardContent, CardHeader } from './ui/Card'

export function ModelInfo() {
  const metrics = [
    { label: 'Architecture', value: MODEL_METRICS.architecture, icon: BrainCircuit },
    { label: 'Forecast Horizon', value: MODEL_METRICS.forecastHorizon, icon: Target },
    { label: 'F1 Score', value: MODEL_METRICS.f1Score.toFixed(3), icon: Gauge },
    { label: 'ROC-AUC', value: MODEL_METRICS.rocAuc.toFixed(3), icon: Gauge },
    { label: 'Recall', value: `${MODEL_METRICS.recall}%`, icon: Gauge },
  ]

  return (
    <Card>
      <CardHeader
        title="Model Metadata"
        subtitle="Offline validation metrics from training — not live predictions"
        icon={<BrainCircuit className="h-4 w-4" />}
      />

      <CardContent className="grid gap-3 sm:grid-cols-2">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <Icon className="h-3.5 w-3.5 text-teal-700" />
              {label}
            </div>
            <p className="mt-2 font-mono text-base font-semibold text-teal-800">{value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
