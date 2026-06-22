import { memo } from 'react';
import { GeoJSON, MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import type { FeatureCollection } from 'geojson';
import pkNational from '../data/pk_national.json';
import {
  BASEMAP_SUBDOMAINS,
  BASEMAP_URL,
  MAP_CENTER,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_ZOOM,
} from '../data/mapConfig';
import type { AdminUnit, LstmPrediction } from '../types/flood';
import { AdminBoundaryLayer } from './AdminBoundaryLayer';
import { FloodLegend } from './FloodLegend';
import { MapLocationBreadcrumb } from './MapLocationBreadcrumb';
import { MapRegionControls } from './MapRegionControls';
import 'leaflet/dist/leaflet.css';

interface DistrictFloodMapProps {
  adminUnits: AdminUnit[];
  predictionsByAdminId: Map<string, LstmPrediction>;
  showRiskLayer: boolean;
  inferenceCount: number;
}

export const DistrictFloodMap = memo(function DistrictFloodMap({
  adminUnits,
  predictionsByAdminId,
  showRiskLayer,
  inferenceCount,
}: DistrictFloodMapProps) {
  return (
    <section className="card mappanel interactive-card district-flood-map" aria-label="Flood-risk map">
      <MapRegionControls />
      <MapLocationBreadcrumb />
      <div className="map-header">
        <h3>Pakistan flood-risk map</h3>
        <span className="map-station-count">
          {showRiskLayer
            ? `${inferenceCount} district${inferenceCount === 1 ? '' : 's'} inferred`
            : 'Navigate the map, pick a date, then run inference'}
        </span>
      </div>
      {showRiskLayer && <FloodLegend />}
      <div className="map-container">
        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_ZOOM}
          minZoom={MAP_MIN_ZOOM}
          maxZoom={MAP_MAX_ZOOM}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
          preferCanvas
          attributionControl={false}
          zoomControl={false}
        >
          <TileLayer url={BASEMAP_URL} subdomains={BASEMAP_SUBDOMAINS} attribution="" updateWhenIdle />
          <AdminBoundaryLayer
            adminUnits={adminUnits}
            predictionsByAdminId={predictionsByAdminId}
            showRiskLayer={showRiskLayer}
          />
          <GeoJSON
            data={pkNational as FeatureCollection}
            style={{ fill: false, color: '#0C3851', weight: 1.6, opacity: 0.9 }}
          />
          <ZoomControl position="topright" />
        </MapContainer>
      </div>
    </section>
  );
});
