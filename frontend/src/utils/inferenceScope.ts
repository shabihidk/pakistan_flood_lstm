import type { AdminUnit } from '../types/flood';
import type { BoundaryLevel, RegionFilter } from '../types/region';
import { adminIdFromRegion } from './selectionSync';

export type InferenceScope =
  | { mode: 'province'; province: string }
  | { mode: 'district'; adminId: string };

export function resolveInferenceScope(
  region: RegionFilter,
  boundaryLevel: BoundaryLevel,
  selectedAdminId: string | null,
  adminUnits: AdminUnit[],
): InferenceScope | null {
  if (
    boundaryLevel === 'province' &&
    region.level === 'province' &&
    region.province
  ) {
    return { mode: 'province', province: region.province };
  }

  if (selectedAdminId) {
    return { mode: 'district', adminId: selectedAdminId };
  }

  const fromRegion = adminIdFromRegion(region, adminUnits);
  if (fromRegion) {
    return { mode: 'district', adminId: fromRegion };
  }

  if (region.province && boundaryLevel === 'province') {
    return { mode: 'province', province: region.province };
  }

  return null;
}

export function mapScopeLabel(region: RegionFilter): string {
  if (region.tehsil && region.district && region.province) {
    return `${region.tehsil} · ${region.district} · ${region.province}`;
  }
  if (region.district && region.province) {
    return `${region.district} · ${region.province}`;
  }
  if (region.province) return region.province;
  return 'Pakistan';
}

export function featureMatchesRegion(
  props: { name?: string; province?: string; district?: string; level?: string },
  region: RegionFilter,
  boundaryLevel?: BoundaryLevel,
): boolean {
  if (boundaryLevel === 'province' && props.level === 'province') {
    return Boolean(region.province) && (props.name === region.province || props.province === region.province);
  }
  if (boundaryLevel === 'district' && props.level === 'district') {
    return (
      Boolean(region.district && region.province) &&
      props.name === region.district &&
      props.province === region.province
    );
  }
  if (boundaryLevel === 'tehsil' && props.level === 'tehsil') {
    return (
      Boolean(region.tehsil && region.district && region.province) &&
      props.name === region.tehsil &&
      props.district === region.district &&
      props.province === region.province
    );
  }
  if (region.level === 'province' && props.level === 'province') {
    return props.name === region.province || props.province === region.province;
  }
  if (region.level === 'district' && props.level === 'district') {
    return props.name === region.district && props.province === region.province;
  }
  if (region.level === 'tehsil' && props.level === 'tehsil') {
    return (
      props.name === region.tehsil &&
      props.district === region.district &&
      props.province === region.province
    );
  }
  return false;
}
