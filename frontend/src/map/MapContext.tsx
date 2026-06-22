import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { BoundaryLevel, RegionFilter } from '../types/region';
import { COUNTRY_FILTER } from '../types/region';

interface MapContextValue {
  boundaryLevel: BoundaryLevel;
  setBoundaryLevel: (level: BoundaryLevel) => void;
  region: RegionFilter;
  setRegion: (region: RegionFilter) => void;
}

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({ children }: { children: ReactNode }) {
  const [boundaryLevel, setBoundaryLevel] = useState<BoundaryLevel>('district');
  const [region, setRegion] = useState<RegionFilter>(COUNTRY_FILTER);

  const value = useMemo(
    () => ({ boundaryLevel, setBoundaryLevel, region, setRegion }),
    [boundaryLevel, region],
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMapContext(): MapContextValue {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMapContext must be used within MapProvider');
  return ctx;
}
