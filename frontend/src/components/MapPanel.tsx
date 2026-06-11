import { memo, useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Layers, MapPinned } from 'lucide-react'
import {
  BASEMAP_OPTIONS,
  BASIN_MARKERS,
  PAKISTAN_MAP_CENTER,
  PAKISTAN_MAP_ZOOM,
  type BasemapId,
} from '../constants/basins'
import { cn } from '../lib/utils'
import type { BasinLocation } from '../types'

interface MapPanelProps {
  activeBasin: BasinLocation | null
  onBasinSelect: (basin: BasinLocation) => void
  basemap: BasemapId
  onBasemapChange: (basemap: BasemapId) => void
  isLoading?: boolean
}

function createBasinIcon(index: number, active: boolean) {
  return L.divIcon({
    className: '',
    html: `<div class="basin-marker ${active ? 'active' : ''}">${index}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

function MapFocus({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()

  useEffect(() => {
    map.flyTo([lat, lng], 7, { duration: 0.8 })
  }, [lat, lng, map])

  return null
}

function MapPanelComponent({
  activeBasin,
  onBasinSelect,
  basemap,
  onBasemapChange,
  isLoading = false,
}: MapPanelProps) {
  const selectedBasemap = useMemo(
    () => BASEMAP_OPTIONS.find((option) => option.id === basemap) ?? BASEMAP_OPTIONS[0],
    [basemap],
  )

  const activeMarker = useMemo(
    () => BASIN_MARKERS.find((marker) => marker.id === activeBasin) ?? null,
    [activeBasin],
  )

  return (
    <section className="dashboard-card flex h-full min-h-[420px] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <MapPinned className="h-4 w-4 text-teal-700" />
          Live Basin Map
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Basemap
          </span>
          {BASEMAP_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onBasemapChange(option.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                basemap === option.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex-1">
        {isLoading && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
            <div className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-teal-800 shadow-lg">
              Running LSTM inference...
            </div>
          </div>
        )}

        <MapContainer
          center={PAKISTAN_MAP_CENTER}
          zoom={PAKISTAN_MAP_ZOOM}
          className="h-full w-full min-h-[360px]"
          scrollWheelZoom
        >
          <TileLayer
            key={selectedBasemap.id}
            url={selectedBasemap.url}
            attribution={selectedBasemap.attribution}
          />

          {BASIN_MARKERS.map((marker, index) => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={createBasinIcon(index + 1, activeBasin === marker.id)}
              eventHandlers={{
                click: () => onBasinSelect(marker.id),
              }}
            />
          ))}

          {activeMarker && <MapFocus lat={activeMarker.lat} lng={activeMarker.lng} />}
        </MapContainer>

        <div className="pointer-events-none absolute bottom-4 left-4 z-[400] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Layers className="h-3.5 w-3.5 text-teal-700" />
            Click a numbered station marker to run inference
          </div>
        </div>
      </div>
    </section>
  )
}

export const MapPanel = memo(MapPanelComponent)
