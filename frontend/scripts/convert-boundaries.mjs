/**
 * Converts Pakistan admin shapefiles to simplified GeoJSON for the web app.
 * Run: node scripts/convert-boundaries.mjs
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as shapefile from 'shapefile';
import simplify from '@turf/simplify';
import { featureCollection } from '@turf/helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BOUNDARY_DIR = path.join(
  ROOT,
  'src/Pakistan-Administrative-Boundaries/Pakistan, Tehsil and District Boundaries',
);
const OUT_DIR = path.join(ROOT, 'src/data');

const PROVINCE_ALIASES = {
  'Azad Jammu & Kashmir': 'Azad Kashmir',
  'Azad Jammu and Kashmir': 'Azad Kashmir',
  AJK: 'Azad Kashmir',
  KPK: 'Khyber Pakhtunkhwa',
  'Gilgit-Baltistan': 'Gilgit Baltistan',
  ICT: 'Federal Capital',
  Islamabad: 'Federal Capital',
};

function normalizeProvince(name) {
  if (!name) return 'Unknown';
  const trimmed = String(name).trim();
  return PROVINCE_ALIASES[trimmed] ?? trimmed;
}

function slugify(...parts) {
  return parts
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function regionId(level, province, district, tehsil) {
  if (level === 'province') return `pk-${slugify(province)}`;
  if (level === 'district') return `pk-${slugify(province, district)}`;
  return `pk-${slugify(province, district, tehsil)}`;
}

async function readShapefile(baseName) {
  const shpPath = path.join(BOUNDARY_DIR, `${baseName}.shp`);
  const dbfPath = path.join(BOUNDARY_DIR, `${baseName}.dbf`);
  return shapefile.read(shpPath, dbfPath);
}

function simplifyCollection(fc, tolerance, mapProps) {
  const features = fc.features
    .filter((f) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'))
    .map((f) => ({
      type: 'Feature',
      properties: mapProps(f.properties ?? {}),
      geometry: f.geometry,
    }));

  const simplified = simplify(featureCollection(features), {
    tolerance,
    highQuality: false,
    mutate: true,
  });

  return { type: 'FeatureCollection', features: simplified.features };
}

async function main() {
  console.log('Reading district boundaries…');
  const districts = await readShapefile('District_Boundary');
  console.log(`  ${districts.features.length} districts`);

  const districtFc = simplifyCollection(districts, 0.008, (p) => {
    const province = normalizeProvince(p.Province ?? p.province ?? p.ADM1_EN);
    const name = String(p.name ?? p.District ?? p.ADM2_EN ?? 'Unknown').trim();
    return {
      id: regionId('district', province, name),
      name,
      level: 'district',
      province,
      division: p.division ? String(p.division) : undefined,
    };
  });

  console.log('Reading tehsil boundaries…');
  const tehsils = await readShapefile('Tehsil_Boundary');
  console.log(`  ${tehsils.features.length} tehsils`);

  const tehsilFc = simplifyCollection(tehsils, 0.004, (p) => {
    const province = normalizeProvince(p.province ?? p.Province ?? p.ADM1_EN);
    const district = String(p.district ?? p.District ?? 'Unknown').trim();
    const name = String(p.name ?? p.Name ?? 'Unknown').trim();
    return {
      id: regionId('tehsil', province, district, name),
      name,
      level: 'tehsil',
      province,
      district,
    };
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const districtPath = path.join(OUT_DIR, 'pk_districts.json');
  const tehsilPath = path.join(OUT_DIR, 'pk_tehsils.json');

  fs.writeFileSync(districtPath, JSON.stringify(districtFc));
  fs.writeFileSync(tehsilPath, JSON.stringify(tehsilFc));

  console.log('Building province boundaries from districts…');
  const byProvince = new Map();
  for (const feature of districtFc.features) {
    const province = feature.properties.province;
    if (!byProvince.has(province)) byProvince.set(province, []);
    byProvince.get(province).push(feature);
  }

  const provinceFeatures = [];
  for (const [province, feats] of byProvince.entries()) {
    const polygons = [];
    for (const f of feats) {
      if (f.geometry.type === 'Polygon') polygons.push(f.geometry.coordinates);
      else if (f.geometry.type === 'MultiPolygon') polygons.push(...f.geometry.coordinates);
    }
    provinceFeatures.push({
      type: 'Feature',
      properties: {
        id: regionId('province', province),
        name: province,
        level: 'province',
        province,
      },
      geometry: { type: 'MultiPolygon', coordinates: polygons },
    });
  }
  const provinceFc = { type: 'FeatureCollection', features: provinceFeatures };
  const provincePath = path.join(OUT_DIR, 'pk_provinces.json');
  fs.writeFileSync(provincePath, JSON.stringify(provinceFc));

  const districtSize = (fs.statSync(districtPath).size / 1024 / 1024).toFixed(2);
  const tehsilSize = (fs.statSync(tehsilPath).size / 1024 / 1024).toFixed(2);
  const provinceSize = (fs.statSync(provincePath).size / 1024 / 1024).toFixed(2);
  console.log(`Wrote ${districtPath} (${districtSize} MB, ${districtFc.features.length} features)`);
  console.log(`Wrote ${tehsilPath} (${tehsilSize} MB, ${tehsilFc.features.length} features)`);
  console.log(`Wrote ${provincePath} (${provinceSize} MB, ${provinceFc.features.length} features)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
