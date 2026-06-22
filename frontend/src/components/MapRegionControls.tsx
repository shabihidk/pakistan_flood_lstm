import { useMapContext } from '../map/MapContext';
import { COUNTRY_FILTER, type BoundaryLevel } from '../types/region';
const LEVELS: { id: BoundaryLevel; label: string }[] = [
  { id: 'province', label: 'Province' },
  { id: 'district', label: 'District' },
  { id: 'tehsil', label: 'Tehsil' },
];

export function MapRegionControls() {
  const { boundaryLevel, setBoundaryLevel, region, setRegion } = useMapContext();

  return (
    <div className="map-region-controls">
      <div className="map-level-tabs" role="tablist" aria-label="Boundary level">
        {LEVELS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={boundaryLevel === id}
            className={`map-level-tab${boundaryLevel === id ? ' active' : ''}`}
            onClick={() => {
              setBoundaryLevel(id);
              if (id === 'tehsil' && region.tehsil) {
                setRegion({ ...region, level: 'tehsil', regionName: region.tehsil });
              } else if (id === 'district' && region.district) {
                setRegion({ ...region, level: 'district', regionName: region.district });
              } else if (id === 'province' && region.province) {
                setRegion({ ...region, level: 'province', regionName: region.province });
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {region.level !== 'country' && (
        <button
          type="button"
          className="btn btn-sm map-reset-region"
          onClick={() => {
            setRegion(COUNTRY_FILTER);
            setBoundaryLevel('province');
          }}
        >
          Reset to Pakistan
        </button>
      )}
    </div>
  );
}
