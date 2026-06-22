import type { InferenceResponse } from '../types/inference';
import { MODEL_NAME } from '../constants/model';
import {
  alertLabelForProbability,
  colorForProbability,
  probabilityPercent,
} from '../utils/alertColors';
import { formatProbability } from '../utils/formatNumbers';

interface FloodOutlookSectionProps {
  inference: InferenceResponse | null;
  loading: boolean;
  error: string | null;
  batchCount?: number;
  provinceMode?: boolean;
  scopeLabel?: string;
}

export function FloodOutlookSection({
  inference,
  loading,
  error,
  batchCount = 0,
  provinceMode = false,
  scopeLabel,
}: FloodOutlookSectionProps) {
  if (!inference && !loading && !error) {
    return (
      <section className="flood-outlook card">
        <h3>7-day outlook</h3>
        <p className="flood-empty">Run inference to see daily flood-risk probabilities.</p>
      </section>
    );
  }

  const primaryProb = inference ? probabilityPercent(inference.primaryForecast.probability) : null;
  const primaryColor =
    primaryProb != null ? colorForProbability(inference!.primaryForecast.probability) : undefined;

  return (
    <section className="flood-outlook card" aria-label="7-day flood-risk outlook">
      <div className="flood-outlook-header">
        <div>
          <h3>7-day outlook</h3>
          {scopeLabel && <p className="flood-outlook-scope">{scopeLabel}</p>}
        </div>
        {inference?.anchorDate && <span className="outlook-date-badge">{inference.anchorDate}</span>}
      </div>

      {loading && <p className="flood-loading">Running {MODEL_NAME} inference…</p>}
      {error && <p className="flood-error">{error}</p>}

      {provinceMode && batchCount > 0 && !loading && !error && (
        <p className="flood-hint">
          {batchCount} districts inferred — map colored by risk. Click a district for its daily breakdown.
        </p>
      )}

      {inference && !loading && primaryProb != null && (
        <>
          <div
            className="flood-summary-bar"
            style={{ borderColor: primaryColor, background: `${primaryColor}12` }}
          >
            <div>
              <span className="flood-summary-label">Anchor-day risk</span>
              <strong className="flood-summary-value" style={{ color: primaryColor }}>
                {formatProbability(primaryProb)}
              </strong>
            </div>
            <span className="flood-summary-pill" style={{ background: primaryColor }}>
              {alertLabelForProbability(inference.primaryForecast.probability)}
            </span>
          </div>

          <div className="flood-day-grid" aria-label="7-day sequential outlook">
            {inference.forecasts.map((f) => {
              const prob = probabilityPercent(f.probability);
              const accent = colorForProbability(f.probability);
              return (
                <article
                  key={f.day}
                  className="flood-day-card"
                  style={{ borderTopColor: accent }}
                >
                  <header className="flood-day-head">
                    <span>Day +{f.day}</span>
                    <time dateTime={f.date}>{f.date}</time>
                  </header>
                  <strong className="flood-day-value" style={{ color: accent }}>
                    {formatProbability(prob)}
                  </strong>
                  <span className="flood-day-band">{alertLabelForProbability(f.probability)}</span>
                  <div className="flood-day-bar">
                    <span style={{ width: `${Math.min(100, prob)}%`, background: accent }} />
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
