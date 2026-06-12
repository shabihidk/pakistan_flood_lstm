import { useCallback, useState } from 'react'
import type { BasemapId } from './constants/basins'
import { ControlPanel } from './components/ControlPanel'
import { ForecastTimeline } from './components/ForecastTimeline'
import { Header } from './components/Header'
import { MapPanel } from './components/MapPanel'
import { ModelAuditPanel } from './components/ModelAuditPanel'
import { ModelInfo } from './components/ModelInfo'
import { SituationPanel } from './components/SituationPanel'
import { fetchQuickAudit } from './services/auditService'
import { fetchFloodInference } from './services/forecastService'
import { todayIsoDate } from './lib/utils'
import type {
  BasinLocation,
  DailyForecast,
  PrimaryForecast,
} from './types'
import type { AuditDiagnostics } from './types/audit'

function App() {
  const [selectedDate, setSelectedDate] = useState(todayIsoDate())
  const [activeBasin, setActiveBasin] = useState<BasinLocation | null>(null)
  const [basemap, setBasemap] = useState<BasemapId>('streets')
  const [primaryForecast, setPrimaryForecast] = useState<PrimaryForecast | null>(null)
  const [forecasts, setForecasts] = useState<DailyForecast[] | null>(null)
  const [auditDiagnostics, setAuditDiagnostics] = useState<AuditDiagnostics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inferenceRunId, setInferenceRunId] = useState(0)

  const runInference = useCallback(async (basin: BasinLocation, date: string) => {
    setIsLoading(true)
    setError(null)
    setAuditDiagnostics(null)
    setInferenceRunId((id) => id + 1)

    try {
      const response = await fetchFloodInference(basin, date)
      setPrimaryForecast(response.primaryForecast)
      setForecasts(response.forecasts)

      try {
        const diagnostics = await fetchQuickAudit(
          basin,
          date,
          response.primaryForecast.probability,
        )
        setAuditDiagnostics(diagnostics)
      } catch {
        setAuditDiagnostics(null)
      }
    } catch (inferenceError) {
      const message =
        inferenceError instanceof Error
          ? inferenceError.message
          : 'Unable to complete flood inference.'
      setError(message)
      setPrimaryForecast(null)
      setForecasts(null)
      setAuditDiagnostics(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleBasinSelect = useCallback(
    (basin: BasinLocation) => {
      setActiveBasin(basin)
      void runInference(basin, selectedDate)
    },
    [runInference, selectedDate],
  )

  const handleRunPrediction = useCallback(() => {
    if (!activeBasin) return
    void runInference(activeBasin, selectedDate)
  }, [activeBasin, runInference, selectedDate])

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <MapPanel
          activeBasin={activeBasin}
          onBasinSelect={handleBasinSelect}
          basemap={basemap}
          onBasemapChange={setBasemap}
          isLoading={isLoading}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <Header />

        <div className="relative min-h-0 flex-1">
          <div className="overlay-stack absolute bottom-4 left-4 max-h-[calc(100vh-5.5rem)] w-[min(300px,calc(100vw-2rem))]">
            <ControlPanel
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              activeBasin={activeBasin}
              onRunPrediction={handleRunPrediction}
              isLoading={isLoading}
              error={error}
            />
            <ModelInfo />
          </div>

          <div className="overlay-stack absolute right-4 top-4 w-[min(340px,calc(100vw-2rem))] max-h-[calc(100vh-5.5rem)]">
            {activeBasin && primaryForecast && (
              <ModelAuditPanel
                key={inferenceRunId}
                location={activeBasin}
                targetDate={selectedDate}
                predictedProb={primaryForecast.probability}
                diagnostics={auditDiagnostics}
              />
            )}
            <SituationPanel
              activeBasin={activeBasin}
              primaryForecast={primaryForecast}
              forecasts={forecasts}
              isLoading={isLoading}
            />
            <ForecastTimeline
              primaryForecast={primaryForecast}
              forecasts={forecasts}
              isLoading={isLoading}
              locationLabel={activeBasin ?? undefined}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
