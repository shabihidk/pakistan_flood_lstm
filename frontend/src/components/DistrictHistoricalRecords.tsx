import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { DailyFeature } from '../types/flood';
import { fetchDailyFeatures } from '../services/supabaseFloodService';
import { anchorDateFromYearMonth, yearMonthFromAnchorDate } from '../utils/selectionSync';
import { DECIMALS, formatNumber } from '../utils/formatNumbers';

const HistoryCharts = lazy(() =>
  import('./HistoryCharts').then((m) => ({ default: m.HistoryCharts })),
);

interface DistrictHistoricalRecordsProps {
  adminId: string | null;
  anchorDate: string;
  dateMin?: string | null;
  dateMax?: string | null;
  scopeLabel: string;
  onAnchorDateChange: (date: string) => void;
}

type ViewTab = 'graph' | 'table';

function ChartSkeleton() {
  return <div className="chart-skeleton" aria-hidden><div className="chart-skeleton-block" /></div>;
}

function monthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export function DistrictHistoricalRecords({
  adminId,
  anchorDate,
  dateMin,
  dateMax,
  scopeLabel,
  onAnchorDateChange,
}: DistrictHistoricalRecordsProps) {
  const [tab, setTab] = useState<ViewTab>('graph');
  const [rows, setRows] = useState<DailyFeature[]>([]);
  const [loading, setLoading] = useState(false);

  const { year, month } = yearMonthFromAnchorDate(anchorDate);
  const bounds = { min: dateMin ?? null, max: dateMax ?? null };

  const setYear = (nextYear: number) => {
    onAnchorDateChange(anchorDateFromYearMonth(nextYear, month, anchorDate, bounds));
  };

  const setMonth = (nextMonth: number) => {
    onAnchorDateChange(anchorDateFromYearMonth(year, nextMonth, anchorDate, bounds));
  };

  useEffect(() => {
    if (!adminId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const { from, to } = monthRange(year, month);
    fetchDailyFeatures(adminId, from, to)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adminId, year, month]);

  const series = useMemo(() => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return rows
      .filter((r) => String(r.date ?? '').startsWith(prefix))
      .map((r) => ({
        label: String(parseInt(String(r.date).slice(8, 10), 10)),
        date: String(r.date),
        temp_2m_c: r.temp_2m_c,
        precipitation_mm: r.precipitation_mm,
        soil_moisture: r.soil_moisture,
        surface_pressure_pa: r.surface_pressure_pa != null ? r.surface_pressure_pa / 100 : null,
      }));
  }, [rows, year, month]);

  if (!adminId) {
    return (
      <section className="card records-section">
        <h3>Hydromet history</h3>
        <p className="records-empty">Select a district on the map or from the dropdown to view hydromet history.</p>
      </section>
    );
  }

  return (
    <section className="card records-section">
      <h3>
        Hydromet history
        <span className="card-badge">{scopeLabel}</span>
      </h3>
      {anchorDate && (
        <p className="panel-sub">
          Anchor date <strong>{anchorDate}</strong> — synced with header; change month/year or click a table row
        </p>
      )}
      <div className="records-toolbar">
        <label>
          Year
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {Array.from({ length: 17 }, (_, i) => 2026 - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label>
          Month
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          Anchor date
          <input
            type="date"
            className="date-input"
            value={anchorDate}
            min={dateMin ?? undefined}
            max={dateMax ?? undefined}
            onChange={(e) => onAnchorDateChange(e.target.value)}
          />
        </label>
        <div className="records-tabs">
          <button type="button" className={tab === 'graph' ? 'active' : ''} onClick={() => setTab('graph')}>Graph</button>
          <button type="button" className={tab === 'table' ? 'active' : ''} onClick={() => setTab('table')}>Table</button>
        </div>
      </div>

      {loading && <p className="flood-loading">Loading daily features…</p>}
      {!loading && !series.length && <p className="records-empty">No daily features for this month.</p>}

      {tab === 'graph' && series.length > 0 && (
        <Suspense fallback={<ChartSkeleton />}>
          <HistoryCharts series={series} year={year} month={month} anchorDate={anchorDate} />
        </Suspense>
      )}

      {tab === 'table' && series.length > 0 && (
        <table className="summary-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Temp (°C)</th>
              <th>Precip (mm)</th>
              <th>Soil moisture</th>
              <th>Pressure (hPa)</th>
            </tr>
          </thead>
          <tbody>
            {series.map((row) => (
              <tr
                key={row.date}
                className={row.date === anchorDate ? 'records-row-anchor' : 'records-row-clickable'}
                onClick={() => onAnchorDateChange(row.date)}
              >
                <td>{row.label}</td>
                <td>{formatNumber(row.temp_2m_c, DECIMALS.temperature)}</td>
                <td>{formatNumber(row.precipitation_mm, DECIMALS.precipitation)}</td>
                <td>{formatNumber(row.soil_moisture, 3)}</td>
                <td>{formatNumber(row.surface_pressure_pa, DECIMALS.pressure)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
