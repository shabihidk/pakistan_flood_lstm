import { MODEL_NAME } from '../constants/model';
import type { AdminUnit, LstmPrediction, StaticFeature } from '../types/flood';
import type { ContextSummary } from '../types/context';
import { adminUnitById } from '../utils/resolveAdminId';
import {
  alertLabelForProbability,
  alertLevelFromProbability,
  ALERT_COLORS,
  colorForProbability,
  probabilityPercent,
} from '../utils/alertColors';
import { formatNumber, formatPrecipitation, formatProbability } from '../utils/formatNumbers';

interface DistrictRiskPanelProps {
  contextAdminId: string | null;
  adminUnits: AdminUnit[];
  prediction: LstmPrediction | null;
  contextSummary: ContextSummary | null;
  contextLoading: boolean;
  staticFeat: StaticFeature | null;
  scopeLabel: string;
}

export function DistrictRiskPanel({
  contextAdminId,
  adminUnits,
  prediction,
  contextSummary,
  contextLoading,
  staticFeat,
  scopeLabel,
}: DistrictRiskPanelProps) {
  const unit = contextAdminId ? adminUnitById(adminUnits, contextAdminId) : undefined;
  const avg = contextSummary?.averages;

  if (!contextAdminId && !contextSummary && !prediction) {
    return (
      <article className="card district-risk-panel">
        <h3>Area overview</h3>
        <p className="flood-empty">Select a location on the map or from the district list, then run inference.</p>
      </article>
    );
  }

  const probPercent = prediction ? probabilityPercent(prediction.probability) : null;
  const alertLevel = prediction ? alertLevelFromProbability(prediction.probability) : null;
  const accent = probPercent != null ? colorForProbability(probPercent) : '#b8c5ce';

  return (
    <article className="card district-risk-panel">
      <h3>
        {unit?.district ?? unit?.name ?? scopeLabel}
        {unit?.province && <span className="card-badge">{unit.province}</span>}
      </h3>

      {contextLoading && (
        <p className="flood-loading">Loading hydromet context for {scopeLabel}…</p>
      )}

      {contextSummary && !contextLoading && (
        <section className="panel-block">
          <h4>Recent hydromet</h4>
          <p className="panel-sub">
            {contextSummary.from} → {contextSummary.to}
            {contextSummary.admin_count > 1
              ? ` · avg across ${contextSummary.admin_count} districts`
              : ''}
          </p>
          <div className="metric-strip">
            <div>
              <div className="k">Temperature</div>
              <div className="v">{formatNumber(avg?.temp_2m_c, 1)} °C</div>
            </div>
            <div>
              <div className="k">Precipitation</div>
              <div className="v">{formatPrecipitation(avg?.precipitation_mm ?? 0)}</div>
            </div>
            <div>
              <div className="k">Soil moisture</div>
              <div className="v">{formatNumber(avg?.soil_moisture, 3)}</div>
            </div>
            <div>
              <div className="k">Runoff</div>
              <div className="v">{formatPrecipitation(avg?.runoff_mm ?? 0)}</div>
            </div>
          </div>
        </section>
      )}

      {!prediction && !contextLoading && (
        <p className="flood-empty">Run inference to see 7-day flood-risk probabilities.</p>
      )}

      {prediction && probPercent != null && alertLevel && (
        <section
          className="flood-result-card"
          style={{ borderLeftColor: accent, background: `${accent}14` }}
        >
          <div className="flood-result-top">
            <span className="flood-result-label">7-day flood-risk</span>
            <span
              className="flood-result-pill"
              style={{ background: accent, color: '#fff' }}
            >
              {alertLabelForProbability(prediction.probability)}
            </span>
          </div>
          <strong className="flood-result-prob" style={{ color: accent }}>
            {formatProbability(probPercent)}
          </strong>
          <div className="flood-result-bar">
            <span style={{ width: `${Math.min(100, probPercent)}%`, background: accent }} />
          </div>
          <dl className="flood-result-meta">
            <div>
              <dt>Anchor date</dt>
              <dd>{prediction.forecast_date}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{MODEL_NAME}</dd>
            </div>
            <div>
              <dt>Threshold</dt>
              <dd>
                {formatNumber(
                  prediction.threshold > 1 ? prediction.threshold : prediction.threshold * 100,
                  1,
                )}%
              </dd>
            </div>
            <div>
              <dt>Band</dt>
              <dd style={{ color: ALERT_COLORS[alertLevel] }}>{alertLabelForProbability(prediction.probability)}</dd>
            </div>
          </dl>
        </section>
      )}

      {staticFeat && contextAdminId && (
        <section className="panel-block">
          <h4>Terrain &amp; land cover</h4>
          <div className="metric-strip">
            <div>
              <div className="k">Elevation</div>
              <div className="v">{formatNumber(staticFeat.elevation_mean_m, 0)} m</div>
            </div>
            <div>
              <div className="k">Slope</div>
              <div className="v">{formatNumber(staticFeat.slope_mean_deg, 1)}°</div>
            </div>
            <div>
              <div className="k">Relief</div>
              <div className="v">{formatNumber(staticFeat.relief_m, 0)} m</div>
            </div>
            <div>
              <div className="k">Crop</div>
              <div className="v">{formatNumber((staticFeat.lulc_crop_frac ?? 0) * 100, 1)}%</div>
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
