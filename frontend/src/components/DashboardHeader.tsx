import type { AdminUnit } from '../types/flood';

interface DashboardHeaderProps {
  adminUnits: AdminUnit[];
  selectedAdminId: string | null;
  anchorDate: string;
  dateMin?: string | null;
  dateMax?: string | null;
  onAdminChange: (adminId: string | null) => void;
  onDateChange: (date: string) => void;
  onRunInference: () => void;
  inferenceLoading: boolean;
  scopeLabel: string;
  provinceMode: boolean;
  canRunInference: boolean;
  hasLocationScope: boolean;
}

export function DashboardHeader({
  adminUnits,
  selectedAdminId,
  anchorDate,
  dateMin,
  dateMax,
  onAdminChange,
  onDateChange,
  onRunInference,
  inferenceLoading,
  scopeLabel,
  provinceMode,
  canRunInference,
  hasLocationScope,
}: DashboardHeaderProps) {
  return (
    <header className="district-dashboard-header card glass-panel">
      <div>
        <h2>National 7-day flood-risk dashboard</h2>
        <p className="flood-hint">{scopeLabel}</p>
      </div>
      <div className="district-dashboard-controls">
        <label>
          District
          <select
            className="station-select"
            value={selectedAdminId ?? ''}
            onChange={(e) => onAdminChange(e.target.value || null)}
          >
            <option value="">— Select district —</option>
            {adminUnits.map((u) => (
              <option key={u.admin_id} value={u.admin_id}>
                {u.district ?? u.name} · {u.province}
              </option>
            ))}
          </select>
        </label>
        <label>
          Inference anchor date
          <input
            type="date"
            className="date-input"
            value={anchorDate}
            min={dateMin ?? undefined}
            max={dateMax ?? undefined}
            onChange={(e) => onDateChange(e.target.value)}
            disabled={!hasLocationScope}
          />
        </label>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canRunInference || inferenceLoading}
          onClick={onRunInference}
        >
          {inferenceLoading
            ? 'Running…'
            : provinceMode
              ? 'Run province inference'
              : 'Run 7-day inference'}
        </button>
      </div>
    </header>
  );
}
