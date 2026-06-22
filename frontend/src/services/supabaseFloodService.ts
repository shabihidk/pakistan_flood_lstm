import type { AdminUnit, DailyFeature, LstmPrediction } from '../types/flood';
import type { ContextSummary } from '../types/context';
import type { InferenceResponse } from '../types/inference';
import { getSupabaseClient, supabaseDirectConfigured } from '../lib/supabaseClient';
import { getApiBaseUrl } from '../lib/env';

const API_BASE = getApiBaseUrl();

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.error === 'string' ? body.error : `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(typeof payload.error === 'string' ? payload.error : `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface BatchPrediction extends LstmPrediction {
  forecasts?: InferenceResponse['forecasts'];
}

export interface BatchInferenceResponse {
  count: number;
  alert_distribution: Record<string, number>;
  predictions: BatchPrediction[];
}

export async function fetchAdminUnits(): Promise<AdminUnit[]> {
  if (supabaseDirectConfigured()) {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('admin_units')
      .select('*')
      .eq('level', 'district')
      .order('province')
      .order('district');
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminUnit[];
  }
  const payload = await apiGet<{ units: AdminUnit[] }>('/admin-units');
  return payload.units ?? [];
}

export async function fetchDateBounds(adminId: string): Promise<{ min: string | null; max: string | null }> {
  const payload = await apiGet<{ bounds: { min: string | null; max: string | null } }>(
    `/daily-features/${encodeURIComponent(adminId)}`,
  );
  return payload.bounds ?? { min: null, max: null };
}

export async function fetchDailyFeatures(
  adminId: string,
  from?: string,
  to?: string,
): Promise<DailyFeature[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString() ? `?${params}` : '';
  const payload = await apiGet<{ rows: DailyFeature[] }>(
    `/daily-features/${encodeURIComponent(adminId)}${qs}`,
  );
  return payload.rows ?? [];
}

export async function fetchContextSummary(params: {
  adminId?: string;
  province?: string;
  date: string;
  days?: number;
}): Promise<ContextSummary> {
  const qs = new URLSearchParams({ date: params.date, days: String(params.days ?? 7) });
  if (params.adminId) qs.set('admin_id', params.adminId);
  if (params.province) qs.set('province', params.province);
  return apiGet<ContextSummary>(`/context-summary?${qs}`);
}

export async function runDistrictInference(
  adminId: string,
  anchorDate: string,
  upsert = false,
): Promise<InferenceResponse> {
  return apiPost<InferenceResponse>('/inference', {
    admin_id: adminId,
    date: anchorDate,
    upsert,
  });
}

export async function runProvinceInference(
  province: string,
  anchorDate: string,
  upsert = false,
): Promise<BatchInferenceResponse> {
  return apiPost<BatchInferenceResponse>('/inference/batch', {
    province,
    date: anchorDate,
    upsert,
  });
}

export async function fetchStaticFeature(adminId: string): Promise<import('../types/flood').StaticFeature | null> {
  if (supabaseDirectConfigured()) {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('static_features')
      .select('*')
      .eq('admin_id', adminId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as import('../types/flood').StaticFeature | null) ?? null;
  }
  try {
    return await apiGet<import('../types/flood').StaticFeature>(
      `/static-features/${encodeURIComponent(adminId)}`,
    );
  } catch {
    return null;
  }
}

export async function loadAdminUnits(): Promise<AdminUnit[]> {
  return fetchAdminUnits();
}
