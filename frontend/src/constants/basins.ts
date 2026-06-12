import type { BasinLocation } from '../types'

export interface BasinMarker {
  id: BasinLocation
  name: BasinLocation
  /** [longitude, latitude] */
  coordinates: [number, number]
  lat: number
  lng: number
}

export type BasemapId = 'streets' | 'esri' | 'topo' | 'carto'

export interface BasemapOption {
  id: BasemapId
  label: string
  url: string
  attribution: string
}

export const BASIN_MARKERS: BasinMarker[] = [
  {
    id: 'Islamabad',
    name: 'Islamabad',
    coordinates: [73.0479, 33.6844],
    lat: 33.6844,
    lng: 73.0479,
  },
  {
    id: 'Quetta',
    name: 'Quetta',
    coordinates: [67.0011, 30.1798],
    lat: 30.1798,
    lng: 67.0011,
  },
  {
    id: 'Swat',
    name: 'Swat',
    coordinates: [72.4258, 35.2227],
    lat: 35.2227,
    lng: 72.4258,
  },
  {
    id: 'Jhang',
    name: 'Jhang',
    coordinates: [72.3317, 31.2681],
    lat: 31.2681,
    lng: 72.3317,
  },
]

export const BASEMAP_OPTIONS: BasemapOption[] = [
  {
    id: 'streets',
    label: 'Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  {
    id: 'esri',
    label: 'Esri',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
  {
    id: 'topo',
    label: 'Hydro',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap',
  },
  {
    id: 'carto',
    label: 'Carto',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
  },
]

export const PAKISTAN_MAP_CENTER: [number, number] = [30.5, 69.5]
export const PAKISTAN_MAP_ZOOM = 6
/** Leaflet bounds: [[south, west], [north, east]] */
export const PAKISTAN_MAP_BOUNDS: [[number, number], [number, number]] = [
  [23.5, 60.5],
  [37.5, 77.5],
]

export const MODEL_METRICS = {
  architecture: 'LSTM',
  forecastHorizon: '7 Days',
  f1Score: 0.565,
  rocAuc: 0.928,
  recall: 60.1,
} as const
