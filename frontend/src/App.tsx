import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { DistrictFloodMap } from './components/DistrictFloodMap';
import { DistrictRiskPanel } from './components/DistrictRiskPanel';
import { DashboardHeader } from './components/DashboardHeader';
import { FloodOutlookSection } from './components/FloodOutlookSection';
import { DistrictHistoricalRecords } from './components/DistrictHistoricalRecords';
import { MapProvider, useMapContext } from './map/MapContext';
import {
  fetchContextSummary,
  fetchDateBounds,
  fetchStaticFeature,
  loadAdminUnits,
  runDistrictInference,
  runProvinceInference,
  type BatchPrediction,
} from './services/supabaseFloodService';
import type { AdminUnit, LstmPrediction, StaticFeature } from './types/flood';
import type { ContextSummary } from './types/context';
import type { InferenceResponse } from './types/inference';
import { dataSourceConfigured } from './lib/dataSource';
import { mapScopeLabel, resolveInferenceScope } from './utils/inferenceScope';
import {
  adminIdFromRegion,
  applyDistrictSelection,
  clampAnchorDate,
  defaultAnchorDate,
} from './utils/selectionSync';
function DashboardBody() {
  const { boundaryLevel, region, setRegion, setBoundaryLevel } = useMapContext();
  const [adminUnits, setAdminUnits] = useState<AdminUnit[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [anchorDate, setAnchorDate] = useState('');
  const [dateBounds, setDateBounds] = useState<{ min: string | null; max: string | null }>({
    min: null,
    max: null,
  });
  const [inference, setInference] = useState<InferenceResponse | null>(null);
  const [batchPredictions, setBatchPredictions] = useState<BatchPrediction[]>([]);
  const [inferenceLoading, setInferenceLoading] = useState(false);
  const [inferenceError, setInferenceError] = useState<string | null>(null);
  const [contextSummary, setContextSummary] = useState<ContextSummary | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [staticFeat, setStaticFeat] = useState<StaticFeature | null>(null);
  const [livePredictions, setLivePredictions] = useState<Map<string, LstmPrediction>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectionSource = useRef<'map' | 'dropdown' | null>(null);

  const scopeLabel = mapScopeLabel(region);

  const inferenceScope = useMemo(
    () => resolveInferenceScope(region, boundaryLevel, selectedAdminId, adminUnits),
    [adminUnits, boundaryLevel, region, selectedAdminId],
  );

  const handleAnchorDateChange = useCallback(
    (date: string) => {
      setAnchorDate(clampAnchorDate(date, dateBounds));
    },
    [dateBounds],
  );

  const handleDistrictSelect = useCallback(
    (adminId: string | null) => {
      selectionSource.current = 'dropdown';
      if (!adminId) {
        setSelectedAdminId(null);
        return;
      }
      const next = applyDistrictSelection(adminId, adminUnits, region);
      setSelectedAdminId(next.adminId);
      setRegion(next.region);
      setBoundaryLevel(next.region.tehsil ? 'tehsil' : 'district');
    },
    [adminUnits, region, setBoundaryLevel, setRegion],
  );

  useEffect(() => {
    loadAdminUnits()
      .then(setAdminUnits)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load admin units');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectionSource.current === 'dropdown') {
      selectionSource.current = null;
      return;
    }
    const derived = adminIdFromRegion(region, adminUnits);
    setSelectedAdminId((prev) => (prev === derived ? prev : derived));
  }, [adminUnits, boundaryLevel, region]);

  useEffect(() => {
    const adminId = selectedAdminId;
    if (!adminId) {
      setStaticFeat(null);
      if (region.level === 'country' && !region.province) {
        setDateBounds({ min: null, max: null });
        setAnchorDate('');
      }
      return;
    }
    let cancelled = false;
    fetchDateBounds(adminId)
      .then((bounds) => {
        if (cancelled) return;
        setDateBounds(bounds);
        setAnchorDate((prev) => defaultAnchorDate(bounds, prev));
      })
      .catch(() => {
        if (!cancelled) setDateBounds({ min: null, max: null });
      });
    fetchStaticFeature(adminId)
      .then((row) => {
        if (!cancelled) setStaticFeat(row);
      })
      .catch(() => {
        if (!cancelled) setStaticFeat(null);
      });
    return () => {
      cancelled = true;
    };
  }, [region.level, region.province, selectedAdminId]);

  useEffect(() => {
    if (selectedAdminId || !region.province || !adminUnits.length) return;
    const slug = region.province.toLowerCase().replace(/[\s-]+/g, '_');
    const sample = adminUnits.find(
      (u) => (u.province ?? '').toLowerCase().replace(/[\s-]+/g, '_') === slug,
    );
    if (!sample) return;
    let cancelled = false;
    fetchDateBounds(sample.admin_id)
      .then((bounds) => {
        if (cancelled) return;
        setDateBounds(bounds);
        setAnchorDate((prev) => (prev ? prev : defaultAnchorDate(bounds, '')));
      })
      .catch(() => {
        if (!cancelled) setDateBounds({ min: null, max: null });
      });
    return () => {
      cancelled = true;
    };
  }, [adminUnits, region.province, selectedAdminId]);

  useEffect(() => {
    if (!batchPredictions.length || !anchorDate) return;
    const scope = resolveInferenceScope(region, boundaryLevel, selectedAdminId, adminUnits);
    if (scope?.mode !== 'district') return;
    const match = batchPredictions.find((p) => p.admin_id === scope.adminId);
    if (!match?.forecasts) return;
    setInference({
      admin_id: match.admin_id,
      anchorDate,
      primaryForecast: {
        date: anchorDate,
        probability: match.probability,
        alert_level: match.alert_level,
        horizonDays: match.horizon_days,
      },
      forecasts: match.forecasts,
      threshold: match.threshold,
      model_version: match.model_version,
      generatedAt: new Date().toISOString(),
      source: match.source,
    });
  }, [anchorDate, adminUnits, batchPredictions, boundaryLevel, region, selectedAdminId]);

  const runInference = useCallback(async () => {
    if (!anchorDate || !inferenceScope) return;
    setInferenceLoading(true);
    setInferenceError(null);
    setContextLoading(true);
    setInference(null);
    setBatchPredictions([]);

    const contextPromise =
      inferenceScope.mode === 'province'
        ? fetchContextSummary({ province: inferenceScope.province, date: anchorDate, days: 7 })
        : fetchContextSummary({ adminId: inferenceScope.adminId, date: anchorDate, days: 7 });

    try {
      const [summary, result] = await Promise.all([
        contextPromise.catch(() => null),
        inferenceScope.mode === 'province'
          ? runProvinceInference(inferenceScope.province, anchorDate, false)
          : runDistrictInference(inferenceScope.adminId, anchorDate, false),
      ]);

      if (summary) setContextSummary(summary);

      if (inferenceScope.mode === 'province' && 'predictions' in result) {
        const preds = result.predictions ?? [];
        setBatchPredictions(preds);
        const map = new Map<string, LstmPrediction>();
        for (const p of preds) map.set(p.admin_id, p);
        setLivePredictions(map);
        const focusId = selectedAdminId ?? preds[0]?.admin_id;
        const match = focusId ? preds.find((p) => p.admin_id === focusId) : undefined;
        if (match?.forecasts) {
          setInference({
            admin_id: match.admin_id,
            anchorDate,
            primaryForecast: {
              date: anchorDate,
              probability: match.probability,
              alert_level: match.alert_level,
              horizonDays: match.horizon_days,
            },
            forecasts: match.forecasts,
            threshold: match.threshold,
            model_version: match.model_version,
            generatedAt: new Date().toISOString(),
            source: match.source,
          });
        }
      } else {
        const single = result as InferenceResponse;
        setInference(single);
        setLivePredictions(
          new Map([
            [
              single.admin_id,
              {
                admin_id: single.admin_id,
                forecast_date: single.anchorDate,
                horizon_days: single.primaryForecast.horizonDays,
                model_version: single.model_version,
                probability: single.primaryForecast.probability,
                alert_level: single.primaryForecast.alert_level,
                threshold: single.threshold,
                source: single.source,
              },
            ],
          ]),
        );
      }
    } catch (err: unknown) {
      setInference(null);
      setBatchPredictions([]);
      setLivePredictions(new Map());
      setInferenceError(err instanceof Error ? err.message : 'Inference failed');
    } finally {
      setInferenceLoading(false);
      setContextLoading(false);
    }
  }, [anchorDate, inferenceScope, selectedAdminId]);

  const selectedPrediction = useMemo(() => {
    if (inference) {
      return {
        admin_id: inference.admin_id,
        forecast_date: inference.anchorDate,
        horizon_days: inference.primaryForecast.horizonDays,
        model_version: inference.model_version,
        probability: inference.primaryForecast.probability,
        alert_level: inference.primaryForecast.alert_level,
        threshold: inference.threshold,
        source: inference.source,
      } satisfies LstmPrediction;
    }
    if (selectedAdminId) return livePredictions.get(selectedAdminId) ?? null;
    return null;
  }, [inference, livePredictions, selectedAdminId]);

  const canRunInference = Boolean(anchorDate && inferenceScope);
  const hasLocationScope = Boolean(selectedAdminId || region.province);

  return (
    <div className="app">
      <TopBar />

      {!dataSourceConfigured() && (
        <p className="flood-error banner">
          No data source configured. Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY, or run the Flask API on port 5000.
        </p>
      )}

      {error && <p className="flood-error banner">{error}</p>}
      {loading && <p className="flood-loading">Loading admin units…</p>}

      <DashboardHeader
        adminUnits={adminUnits}
        selectedAdminId={selectedAdminId}
        anchorDate={anchorDate}
        dateMin={dateBounds.min}
        dateMax={dateBounds.max}
        onAdminChange={handleDistrictSelect}
        onDateChange={handleAnchorDateChange}
        onRunInference={runInference}
        inferenceLoading={inferenceLoading}
        scopeLabel={scopeLabel}
        provinceMode={inferenceScope?.mode === 'province'}
        canRunInference={canRunInference}
        hasLocationScope={hasLocationScope}
      />

      <div className="main-grid district-dashboard-grid">
        <DistrictRiskPanel
          contextAdminId={selectedAdminId}
          adminUnits={adminUnits}
          prediction={selectedPrediction}
          contextSummary={contextSummary}
          contextLoading={contextLoading || inferenceLoading}
          staticFeat={staticFeat}
          scopeLabel={scopeLabel}
        />
        <DistrictFloodMap
          adminUnits={adminUnits}
          predictionsByAdminId={livePredictions}
          showRiskLayer={livePredictions.size > 0}
          inferenceCount={livePredictions.size}
        />
      </div>

      <FloodOutlookSection
        inference={inference}
        loading={inferenceLoading}
        error={inferenceError}
        batchCount={batchPredictions.length}
        provinceMode={inferenceScope?.mode === 'province'}
        scopeLabel={scopeLabel}
      />

      <DistrictHistoricalRecords
        adminId={selectedAdminId}
        anchorDate={anchorDate}
        dateMin={dateBounds.min}
        dateMax={dateBounds.max}
        scopeLabel={scopeLabel}
        onAnchorDateChange={handleAnchorDateChange}
      />
    </div>
  );
}

export default function App() {
  return (
    <MapProvider>
      <DashboardBody />
    </MapProvider>
  );
}
