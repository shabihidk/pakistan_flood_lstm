import { supabaseDirectConfigured } from './supabaseClient';
import { getApiBaseUrl } from './env';

const API_BASE = getApiBaseUrl();

/** True when browser can talk to Supabase directly (anon key set). */
export function supabaseConfigured(): boolean {
  return supabaseDirectConfigured();
}

/** True when backend API proxy is configured (default /api in dev). */
export function apiDataSourceConfigured(): boolean {
  return Boolean(API_BASE);
}

/** Dashboard can load data via Supabase and/or API — not both env vars required. */
export function dataSourceConfigured(): boolean {
  return supabaseDirectConfigured() || apiDataSourceConfigured();
}

export { supabaseDirectConfigured, getSupabaseClient } from './supabaseClient';
