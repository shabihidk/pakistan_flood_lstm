import { useMemo } from 'react';
import { COUNTRY_FILTER } from '../types/region';
import { useMapContext } from '../map/MapContext';
import { mapScopeLabel } from '../utils/inferenceScope';

export function MapLocationBreadcrumb() {
  const { region, setRegion, setBoundaryLevel } = useMapContext();

  const crumbs = useMemo(() => {
    const items: { key: string; label: string; active: boolean }[] = [
      { key: 'country', label: 'Pakistan', active: region.level === 'country' },
    ];
    if (region.province) {
      items.push({
        key: 'province',
        label: region.province,
        active: region.level === 'province',
      });
    }
    if (region.district) {
      items.push({
        key: 'district',
        label: region.district,
        active: region.level === 'district',
      });
    }
    if (region.tehsil) {
      items.push({ key: 'tehsil', label: region.tehsil, active: region.level === 'tehsil' });
    }
    return items;
  }, [region]);

  const navigate = (key: string) => {
    if (key === 'country') {
      setRegion(COUNTRY_FILTER);
      setBoundaryLevel('province');
      return;
    }
    if (key === 'province' && region.province) {
      setRegion({
        level: 'province',
        province: region.province,
        regionId: `pk-${region.province}`,
        regionName: region.province,
      });
      setBoundaryLevel('province');
      return;
    }
    if (key === 'district' && region.province && region.district) {
      setRegion({
        level: 'district',
        province: region.province,
        district: region.district,
        regionId: region.regionId,
        regionName: region.district,
      });
      setBoundaryLevel('district');
      return;
    }
    if (key === 'tehsil' && region.tehsil && region.district && region.province) {
      setRegion({
        level: 'tehsil',
        province: region.province,
        district: region.district,
        tehsil: region.tehsil,
        regionId: region.regionId,
        regionName: region.tehsil,
      });
      setBoundaryLevel('tehsil');
    }
  };

  if (region.level === 'country' && !region.province) return null;

  return (
    <nav className="map-breadcrumb" aria-label="Map location">
      <span className="map-breadcrumb-hint">Viewing</span>
      {crumbs.map((crumb, index) => (
        <span key={crumb.key} className="map-breadcrumb-item">
          {index > 0 && <span className="crumb-sep" aria-hidden>›</span>}
          <button
            type="button"
            className={`crumb-btn${crumb.active ? ' active' : ''}`}
            onClick={() => navigate(crumb.key)}
            aria-current={crumb.active ? 'location' : undefined}
          >
            {crumb.label}
          </button>
        </span>
      ))}
      <span className="map-breadcrumb-context">{mapScopeLabel(region)}</span>
      <button type="button" className="crumb-clear" onClick={() => navigate('country')}>
        Reset
      </button>
    </nav>
  );
}
