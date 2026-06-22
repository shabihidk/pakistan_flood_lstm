/** Map alert_level / probability to choropleth fill colors. */

import type { AlertLevel } from '../types/flood';

export const ALERT_COLORS: Record<AlertLevel, string> = {
  very_high: '#8b0000',
  high: '#e63946',
  moderate: '#fd8d3c',
  low: '#4ecdc4',
};

export const ALERT_LABELS: Record<AlertLevel, string> = {
  very_high: 'Very high risk',
  high: 'High risk',
  moderate: 'Moderate risk',
  low: 'Low risk',
};

/** Raw model output may be 0–1 or 0–100 depending on source. */
export function probabilityFraction(probability: number): number {
  if (!Number.isFinite(probability)) return 0;
  return probability > 1 ? probability / 100 : probability;
}

export function probabilityPercent(probability: number): number {
  if (!Number.isFinite(probability)) return 0;
  return probability > 1 ? probability : probability * 100;
}

/** @deprecated use probabilityPercent */
export function normalizeProbability(probability: number): number {
  return probabilityPercent(probability);
}

export function alertLevelFromProbability(probability: number): AlertLevel {
  const p = probabilityFraction(probability);
  if (p >= 0.75) return 'very_high';
  if (p >= 0.5) return 'high';
  if (p >= 0.25) return 'moderate';
  return 'low';
}

export function colorForProbability(probability: number, _alertLevel?: AlertLevel): string {
  return ALERT_COLORS[alertLevelFromProbability(probability)];
}

export function alertLabelForProbability(probability: number): string {
  return ALERT_LABELS[alertLevelFromProbability(probability)];
}
