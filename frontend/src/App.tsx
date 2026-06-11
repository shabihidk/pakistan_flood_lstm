import { useCallback, useState } from 'react'
import type { BasemapId } from './constants/basins'
import { ControlPanel } from './components/ControlPanel'
import { ForecastTimeline } from './components/ForecastTimeline'
import { Header } from './components/Header'
import { MapPanel } from './components/MapPanel'
import { ModelInfo } from './components/ModelInfo'
import { SituationPanel } from './components/SituationPanel'
import { fetchFloodInference } from './services/forecastService'
import { todayIsoDate } from './lib/utils'
import type {
  BasinLocation,
  DailyForecast,
  FloodInferenceResponse,
  PrimaryForecast,
} from './types'

function App() {
  const [selectedDate, setSelectedDate] = useState(todayIsoDate())
  const [activeBasin, setActiveBasin] = useState<BasinLocation | null>(null)
  const [basemap, setBasemap] = useState<BasemapId>('streets')
  const [primaryForecast, setPrimaryForecast] = useState<PrimaryForecast | null>(null)
  const [forecasts, setForecasts] = useState<DailyForecast[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRun, setLastRun] = useState<FloodInferenceResponse | null>(null)

  const runInference = useCallback(async (basin: BasinLocation, date: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchFloodInference(basin, date)
      setPrimaryForecast(response.primaryForecast)
      setForecasts(response.forecasts)
      setLastRun(response)
    } catch (inferenceError) {
      const message =
        inferenceError instanceof Error
          ? inferenceError.message
          : 'Unable to complete flood inference.'
      setError(message)
      setPrimaryForecast(null)
      setForecasts(null)
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
    <div className="flex min-h-screen flex-col bg-slate-100">
      <Header />

      <div className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-4 p-4 lg:p-5 xl:flex-row xl:overflow-hidden">
        <aside className="w-full shrink-0 space-y-4 xl:w-[300px] xl:overflow-y-auto">
          <ControlPanel
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            activeBasin={activeBasin}
            onRunPrediction={handleRunPrediction}
            isLoading={isLoading}
            error={error}
          />
          <div className="hidden xl:block">
            <ModelInfo />
          </div>
        </aside>

        <main className="min-h-[480px] flex-1 xl:min-h-0">
          <MapPanel
            activeBasin={activeBasin}
            onBasinSelect={handleBasinSelect}
            basemap={basemap}
            onBasemapChange={setBasemap}
            isLoading={isLoading}
          />
          {lastRun && !isLoading && (
            <p className="mt-2 text-center text-xs text-slate-500 xl:text-left">
              Last inference: {lastRun.location} · {lastRun.anchorDate} · primary{' '}
              {lastRun.primaryForecast.probability}%
            </p>
          )}
        </main>

        <aside className="w-full shrink-0 space-y-4 xl:w-[340px] xl:overflow-y-auto">
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
          <div className="xl:hidden">
            <ModelInfo />
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App
