/** Safe numeric rounding for all frontend display and chart data */

export const DECIMALS = {
  temperature: 1,
  precipitation: 2,
  pressure: 1,
  soilMoisture: 3,
  soilMoisturePct: 1,
  probability: 1,
} as const;

export function sanitizeNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

export function roundNumber(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function roundNullable(value: unknown, decimals = 1): number | null {
  const n = sanitizeNumber(value);
  return n == null ? null : roundNumber(n, decimals);
}

export function formatNumber(value: unknown, decimals = 1): string {
  const n = roundNullable(value, decimals);
  return n == null ? '—' : String(n);
}

export function formatValue(value: unknown, suffix = '', decimals = 1): string {
  const n = roundNullable(value, decimals);
  return n == null ? '—' : `${n}${suffix}`;
}

export function formatTemperature(value: unknown): string {
  return formatValue(value, '°', DECIMALS.temperature);
}

export function formatTemperatureUnit(value: unknown): string {
  return formatValue(value, ' °C', DECIMALS.temperature);
}

export function formatPrecipitation(value: unknown): string {
  return formatValue(value, ' mm', DECIMALS.precipitation);
}

export function formatPressure(value: unknown): string {
  return formatValue(value, ' hPa', DECIMALS.pressure);
}

export function formatSoilMoistureFraction(value: unknown): string {
  return formatValue(value, '%', DECIMALS.soilMoisturePct);
}

export function formatSoilMoisturePctFromFraction(fraction: unknown): string {
  const n = roundNullable(fraction, DECIMALS.soilMoisture);
  return n == null ? '—' : formatValue(n * 100, '%', DECIMALS.soilMoisturePct);
}

export function formatProbability(value: unknown): string {
  return formatValue(value, '%', DECIMALS.probability);
}

export interface TelemetryValues {
  temperature: number | null;
  precipitation: number | null;
  pressure: number | null;
  soilMoisture: number | null;
}

export function normalizeTelemetryValues(raw: {
  temperature: unknown;
  precipitation: unknown;
  pressure: unknown;
  soil_moisture?: unknown;
  soilMoisture?: unknown;
}): TelemetryValues {
  return {
    temperature: roundNullable(raw.temperature, DECIMALS.temperature),
    precipitation: roundNullable(raw.precipitation, DECIMALS.precipitation),
    pressure: roundNullable(raw.pressure, DECIMALS.pressure),
    soilMoisture: roundNullable(raw.soil_moisture ?? raw.soilMoisture, DECIMALS.soilMoisture),
  };
}

export function normalizeTimeSeriesPoint(point: {
  label: string;
  timestamp: string;
  temperature: unknown;
  precipitation: unknown;
  pressure: unknown;
  soilMoisture?: unknown;
}): {
  label: string;
  timestamp: string;
  temperature: number | null;
  precipitation: number | null;
  pressure: number | null;
  soilMoisture: number | null;
} {
  const v = normalizeTelemetryValues({
    temperature: point.temperature,
    precipitation: point.precipitation,
    pressure: point.pressure,
    soilMoisture: point.soilMoisture,
  });
  return { label: point.label, timestamp: point.timestamp, ...v };
}
