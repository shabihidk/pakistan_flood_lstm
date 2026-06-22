import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { IIOJK, PROV_FILL } from '../data/mapConfig';
import type { AdminUnit, LstmPrediction } from '../types/flood';
import type { AdminFeatureProps, BoundaryLevel, RegionFilter } from '../types/region';
import {
  alertLabelForProbability,
  colorForProbability,
  probabilityPercent,
} from '../utils/alertColors';
import { featureMatchesRegion } from '../utils/inferenceScope';
import { formatProbability } from '../utils/formatNumbers';
import { resolveAdminIdFromFeature, resolveDistrictAdminIdFromFeature } from '../utils/resolveAdminId';
import { useMapContext } from '../map/MapContext';
interface AdminBoundaryLayerProps {
  adminUnits: AdminUnit[];
  predictionsByAdminId?: Map<string, LstmPrediction>;
  showRiskLayer: boolean;
}

function filterFeatures(fc: FeatureCollection, level: BoundaryLevel, region: RegionFilter) {
  let features = fc.features;
  if (level === 'district' && region.province) {
    features = features.filter((f) => f.properties?.province === region.province);
  }
  if (level === 'tehsil') {
    if (region.district) {
      features = features.filter((f) => f.properties?.district === region.district);
    } else if (region.province) {
      features = features.filter((f) => f.properties?.province === region.province);
    }
  }
  return { type: 'FeatureCollection' as const, features };
}

function provinceMaxPrediction(
  province: string,
  adminUnits: AdminUnit[],
  predictions: Map<string, LstmPrediction>,
): LstmPrediction | undefined {
  let best: LstmPrediction | undefined;
  let bestProb = -1;
  for (const unit of adminUnits) {
    if (unit.province !== province) continue;
    const pred = predictions.get(unit.admin_id);
    if (!pred) continue;
    const p = probabilityPercent(pred.probability);
    if (p > bestProb) {
      bestProb = p;
      best = pred;
    }
  }
  return best;
}

function FitBounds({
  data,
  region,
  boundaryLevel,
}: {
  data: FeatureCollection;
  region: RegionFilter;
  boundaryLevel: BoundaryLevel;
}) {
  const map = useMap();
  useEffect(() => {
    if (region.level === 'country' && !region.province) return;
    const match = data.features.find((f) =>
      featureMatchesRegion((f.properties ?? {}) as AdminFeatureProps, region, boundaryLevel),
    );
    if (!match) return;
    const layer = L.geoJSON(match);
    const bounds = layer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 9 });
  }, [boundaryLevel, data, map, region]);
  return null;
}

export const AdminBoundaryLayer = memo(function AdminBoundaryLayer({
  adminUnits,
  predictionsByAdminId,
  showRiskLayer,
}: AdminBoundaryLayerProps) {
  const geoRef = useRef<L.GeoJSON>(null);
  const { boundaryLevel, region, setRegion } = useMapContext();
  const [provinces, setProvinces] = useState<FeatureCollection | null>(null);
  const [districts, setDistricts] = useState<FeatureCollection | null>(null);
  const [tehsils, setTehsils] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (!provinces) {
      import('../data/pk_provinces.json').then((m) => setProvinces(m.default as FeatureCollection));
    }
    if (!districts) {
      import('../data/pk_districts.json').then((m) => setDistricts(m.default as FeatureCollection));
    }
    if (boundaryLevel === 'tehsil' && !tehsils) {
      import('../data/pk_tehsils.json').then((m) => setTehsils(m.default as FeatureCollection));
    }
  }, [boundaryLevel, districts, provinces, tehsils]);

  const collection = useMemo(() => {
    if (boundaryLevel === 'province') {
      return provinces;
    }
    if (boundaryLevel === 'tehsil') {
      return tehsils ? filterFeatures(tehsils, boundaryLevel, region) : null;
    }
    return districts ? filterFeatures(districts, boundaryLevel, region) : null;
  }, [boundaryLevel, districts, provinces, region, tehsils]);

  const style = useCallback(
    (feature?: Feature<Geometry>) => {
      const props = feature?.properties as AdminFeatureProps | undefined;
      if (!props) return {};
      const province = props.province ?? props.name;
      const disputed = province === IIOJK;
      const baseFill = (province && PROV_FILL[province]) || '#b8c5ce';
      const selected = featureMatchesRegion(props, region, boundaryLevel);
      const adminId = feature ? resolveAdminIdFromFeature(feature, adminUnits) : null;
      const districtAdminId = feature
        ? resolveDistrictAdminIdFromFeature(feature, adminUnits)
        : null;

      let pred: LstmPrediction | undefined;
      if (showRiskLayer && predictionsByAdminId) {
        if (boundaryLevel === 'province' && props.level === 'province') {
          pred = provinceMaxPrediction(props.name, adminUnits, predictionsByAdminId);
        } else if (boundaryLevel === 'tehsil') {
          pred = districtAdminId ? predictionsByAdminId.get(districtAdminId) : undefined;
        } else if (adminId) {
          pred = predictionsByAdminId.get(adminId);
        }
      }

      if (pred) {
        const prob = probabilityPercent(pred.probability);
        return {
          fillColor: colorForProbability(prob),
          fillOpacity: selected ? 0.78 : 0.55,
          color: selected ? '#0C3851' : '#ffffff',
          weight: selected ? 2.5 : 1,
        };
      }

      return {
        fillColor: baseFill,
        fillOpacity: disputed ? 0.35 : selected ? 0.55 : boundaryLevel === 'tehsil' ? 0.15 : 0.32,
        color: selected ? '#0C3851' : '#ffffff',
        weight: selected ? 2.5 : boundaryLevel === 'tehsil' ? 0.6 : 1,
        dashArray: disputed ? '4,3' : undefined,
      };
    },
    [adminUnits, boundaryLevel, predictionsByAdminId, region, showRiskLayer],
  );

  const onEachFeature = useCallback(
    (feature: Feature<Geometry>, layer: L.Layer) => {
      const props = feature.properties as AdminFeatureProps;
      const label = props.name === IIOJK ? 'IIOJK (disputed)' : props.name;
      const adminId = resolveAdminIdFromFeature(feature, adminUnits);
      const districtAdminId = resolveDistrictAdminIdFromFeature(feature, adminUnits);

      let pred: LstmPrediction | undefined;
      if (predictionsByAdminId && showRiskLayer) {
        if (boundaryLevel === 'province' && props.level === 'province') {
          pred = provinceMaxPrediction(props.name, adminUnits, predictionsByAdminId);
        } else if (boundaryLevel === 'tehsil') {
          pred = districtAdminId ? predictionsByAdminId.get(districtAdminId) : undefined;
        } else if (adminId) {
          pred = predictionsByAdminId.get(adminId);
        }
      }

      const tip =
        pred && showRiskLayer
          ? `${label}<br/>7-day risk: ${formatProbability(probabilityPercent(pred.probability))}<br/>${alertLabelForProbability(pred.probability)}`
          : label;
      layer.bindTooltip(tip, { sticky: false, direction: 'top', className: 'prov-tip' });

      const path = layer as L.Path;
      path.on('mouseover', () => path.setStyle({ weight: 2.5, color: '#0C3851' }));
      path.on('mouseout', () => geoRef.current?.resetStyle(path));
      path.on('click', () => {
        if (boundaryLevel === 'tehsil' && props.level === 'tehsil') {
          setRegion({
            level: 'tehsil',
            province: props.province,
            district: props.district ?? '',
            tehsil: props.name,
            regionId: props.id,
            regionName: props.name,
          });
          return;
        }
        if (boundaryLevel === 'province' && props.level === 'province') {
          setRegion({
            level: 'province',
            province: props.name,
            regionId: props.id,
            regionName: props.name,
          });
          return;
        }
        if (props.level === 'district') {
          setRegion({
            level: 'district',
            province: props.province,
            district: props.name,
            regionId: props.id,
            regionName: props.name,
          });
        }
      });
    },
    [adminUnits, boundaryLevel, predictionsByAdminId, setRegion, showRiskLayer],
  );

  if (!collection) return null;

  return (
    <>
      <GeoJSON
        key={`${boundaryLevel}-${region.regionId ?? 'all'}`}
        ref={geoRef}
        data={collection}
        style={style}
        onEachFeature={onEachFeature}
      />
      <FitBounds data={collection} region={region} boundaryLevel={boundaryLevel} />
    </>
  );
});
