import type { AdminUnit } from '../types/flood';
import type { RegionFilter } from '../types/region';
import { adminUnitById, buildAdminId } from './resolveAdminId';

export interface DateBounds {
  min: string | null;
  max: string | null;
}

export function adminIdFromRegion(
  region: RegionFilter,
  adminUnits: AdminUnit[],
): string | null {
  if (!region.province || !region.district) return null;
  const adminId = buildAdminId(region.province, region.district);
  return adminUnits.some((u) => u.admin_id === adminId) ? adminId : null;
}

export function regionFromAdminUnit(unit: AdminUnit, keepTehsil?: RegionFilter): RegionFilter {
  const base: RegionFilter = {
    level: keepTehsil?.tehsil && keepTehsil.district === (unit.district ?? unit.name) ? 'tehsil' : 'district',
    province: unit.province ?? '',
    district: unit.district ?? unit.name,
    regionId: unit.admin_id,
    regionName: unit.district ?? unit.name,
  };
  if (base.level === 'tehsil' && keepTehsil?.tehsil) {
    return { ...base, tehsil: keepTehsil.tehsil };
  }
  return base;
}

export function yearMonthFromAnchorDate(anchorDate: string): { year: number; month: number } {
  if (!anchorDate || anchorDate.length < 7) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const year = parseInt(anchorDate.slice(0, 4), 10);
  const month = parseInt(anchorDate.slice(5, 7), 10);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  return { year, month };
}

export function clampAnchorDate(date: string, bounds: DateBounds): string {
  if (!date) return bounds.max ?? bounds.min ?? '';
  if (bounds.min && date < bounds.min) return bounds.min;
  if (bounds.max && date > bounds.max) return bounds.max;
  return date;
}

export function anchorDateFromYearMonth(
  year: number,
  month: number,
  currentAnchor: string,
  bounds: DateBounds,
): string {
  const day = currentAnchor.length >= 10 ? parseInt(currentAnchor.slice(8, 10), 10) : 1;
  const lastDay = new Date(year, month, 0).getDate();
  const safeDay = Math.min(Math.max(1, Number.isFinite(day) ? day : 1), lastDay);
  const next = `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
  return clampAnchorDate(next, bounds);
}

export function defaultAnchorDate(bounds: DateBounds, current: string): string {
  if (current && (!bounds.min || current >= bounds.min) && (!bounds.max || current <= bounds.max)) {
    return current;
  }
  return bounds.max ?? bounds.min ?? current;
}

export function applyDistrictSelection(
  adminId: string | null,
  adminUnits: AdminUnit[],
  region: RegionFilter,
): { adminId: string | null; region: RegionFilter } {
  if (!adminId) {
    return { adminId: null, region };
  }
  const unit = adminUnitById(adminUnits, adminId);
  if (!unit) return { adminId, region };
  return {
    adminId,
    region: regionFromAdminUnit(unit, region),
  };
}
