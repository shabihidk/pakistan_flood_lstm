import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber } from '../utils/formatNumbers';

interface SeriesPoint {
  label: string;
  date: string;
  temp_2m_c?: number | null;
  precipitation_mm?: number | null;
  soil_moisture?: number | null;
  surface_pressure_pa?: number | null;
}

interface HistoryChartsProps {
  series: SeriesPoint[];
  year: number;
  month: number;
  anchorDate?: string;
}

export function HistoryCharts({ series, year, month, anchorDate }: HistoryChartsProps) {
  const anchorDay =
    anchorDate && anchorDate.startsWith(`${year}-${String(month).padStart(2, '0')}`)
      ? String(parseInt(anchorDate.slice(8, 10), 10))
      : null;

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>
        Daily hydromet — {year}-{String(month).padStart(2, '0')}
        {anchorDay && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--sea)', marginLeft: 8 }}>
            (anchor: day {anchorDay})
          </span>
        )}
      </h4>
      <div className="chart-panel">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={series} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(12,56,81,0.08)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5d6b76' }} />
            <YAxis tick={{ fontSize: 10, fill: '#5d6b76' }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e4e9ed', fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="temp_2m_c" name="Temp (°C)" stroke="#fd8d3c" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="precipitation_mm" name="Precip (mm)" stroke="#20d3f5" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-panel">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={series} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(12,56,81,0.08)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5d6b76' }} />
            <YAxis tick={{ fontSize: 10, fill: '#5d6b76' }} />
            <Tooltip formatter={(v) => formatNumber(v, 2)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="soil_moisture" name="Soil moisture" stroke="#8b4513" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="surface_pressure_pa" name="Pressure (hPa)" stroke="#6b8e23" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
