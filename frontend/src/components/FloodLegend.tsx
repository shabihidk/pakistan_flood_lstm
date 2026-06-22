import type { AlertLevel } from '../types/flood';
import { ALERT_COLORS, ALERT_LABELS } from '../utils/alertColors';

export function FloodLegend() {
  const levels: AlertLevel[] = ['very_high', 'high', 'moderate', 'low'];
  return (
    <div className="flood-legend" aria-label="7-day flood-risk legend">
      <span className="flood-legend-title">7-day flood-risk</span>
      {levels.map((level) => (
        <span key={level} className="flood-legend-item">
          <i style={{ background: ALERT_COLORS[level] }} aria-hidden />
          {ALERT_LABELS[level]}
        </span>
      ))}
    </div>
  );
}
