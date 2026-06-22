import type { AdminUnit } from '../types/flood';

const PROVINCE_ALIASES: Record<string, string> = {
  'federal capital': 'federal_capital',
  'islamabad capital territory': 'federal_capital',
  ict: 'federal_capital',
  'khyber pakhtunkhwa': 'khyber_pakhtunkhwa',
  kp: 'khyber_pakhtunkhwa',
  'k.p.': 'khyber_pakhtunkhwa',
  'gilgit-baltistan': 'gilgit_baltistan',
  'gilgit baltistan': 'gilgit_baltistan',
  'azad kashmir': 'azad_kashmir',
  'ajk': 'azad_kashmir',
};

const DISTRICT_ALIASES: Record<string, string> = {
  islamabad: 'islamabad',
  'karachi central': 'karachi_central',
  'karachi east': 'karachi_east',
  'karachi south': 'karachi_south',
  'karachi west': 'karachi_west',
  'korangi': 'korangi',
  'malir': 'malir',
};

export function normalizeAdminSlug(value: string): string {
  let v = value.trim().toLowerCase();
  if (PROVINCE_ALIASES[v]) return PROVINCE_ALIASES[v];
  if (DISTRICT_ALIASES[v]) return DISTRICT_ALIASES[v];
  v = v.replace(/gilgit[-\s]?baltistan/g, 'gilgit_baltistan');
  v = v.replace(/khyber[\s-]?pakhtunkhwa/g, 'khyber_pakhtunkhwa');
  v = v.replace(/federal capital|islamabad capital territory/g, 'federal_capital');
  v = v.replace(/azad[\s-]?kashmir/g, 'azad_kashmir');
  return v.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function buildAdminId(province: string, district: string): string {
  return `district:${normalizeAdminSlug(province)}:${normalizeAdminSlug(district)}`;
}

export function resolveDistrictAdminIdFromFeature(
  feature: { properties?: Record<string, unknown> | null },
  adminUnits: AdminUnit[],
): string | null {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const level = String(props.level ?? '');
  if (level === 'district') {
    return resolveAdminIdFromFeature(feature, adminUnits);
  }
  const province = String(props.province ?? props.PROVINCE ?? '');
  const district = String(props.district ?? props.DNAME ?? props.name ?? '');
  if (!province || !district || level === 'province') return null;
  return buildAdminId(province, district);
}

export function resolveAdminIdFromFeature(
  feature: { properties?: Record<string, unknown> | null },
  adminUnits: AdminUnit[],
): string | null {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const direct = props.admin_id as string | undefined;
  if (direct) return direct;

  const province = String(props.province ?? props.PROVINCE ?? '');
  const district = String(props.name ?? props.district ?? props.DNAME ?? '');
  if (!province || !district) return null;

  const candidate = buildAdminId(province, district);
  const exact = adminUnits.find((u) => u.admin_id === candidate);
  if (exact) return exact.admin_id;

  const pSlug = normalizeAdminSlug(province);
  const dSlug = normalizeAdminSlug(district);
  const fuzzy = adminUnits.find((u) => {
    const up = normalizeAdminSlug(u.province ?? '');
    const ud = normalizeAdminSlug(u.district ?? u.name ?? '');
    return up === pSlug && ud === dSlug;
  });
  return fuzzy?.admin_id ?? null;
}

export function adminUnitById(adminUnits: AdminUnit[], adminId: string): AdminUnit | undefined {
  return adminUnits.find((u) => u.admin_id === adminId);
}
