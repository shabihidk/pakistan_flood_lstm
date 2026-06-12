import { memo, useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Layers } from 'lucide-react'
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

function MapResize() {
  const map = useMap()

  useEffect(() => {
    const refresh = () => map.invalidateSize()
    refresh()
    window.addEventListener('resize', refresh)
    return () => window.removeEventListener('resize', refresh)
  }, [map])

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
    <div className="absolute inset-0 h-full w-full">
      {isLoading && (
        <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center bg-slate-900/10 backdrop-blur-[1px]">
          <div className="rounded-xl bg-white/95 px-4 py-3 text-sm font-medium text-teal-800 shadow-lg">
            Running LSTM inference...
          </div>
        </div>
      )}

      <MapContainer
        center={PAKISTAN_MAP_CENTER}
        zoom={PAKISTAN_MAP_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          key={selectedBasemap.id}
          url={selectedBasemap.url}
          attribution={selectedBasemap.attribution}
        />
        <MapResize />

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

      <div className="pointer-events-auto absolute top-[4.5rem] left-1/2 z-[1000] flex -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 rounded-xl border border-white/60 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-md">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Basemap
        </span>
        {BASEMAP_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onBasemapChange(option.id)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
              basemap === option.id
                ? 'bg-orange-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-[400] -translate-x-1/2 rounded-xl border border-white/60 bg-white/90 px-3 py-2 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Layers className="h-3.5 w-3.5 text-teal-700" />
          Click a numbered marker to run inference
        </div>
      </div>
    </div>
  )
}

export const MapPanel = memo(MapPanelComponent)
