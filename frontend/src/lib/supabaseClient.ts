import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { assertSafeFrontendEnv } from './env';

assertSafeFrontendEnv();

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

export function supabaseDirectConfigured(): boolean {
  return Boolean(url?.trim() && anonKey?.trim());
}

/** @deprecated use supabaseDirectConfigured or dataSourceConfigured from lib/dataSource */
export function supabaseConfigured(): boolean {
  return supabaseDirectConfigured();
}

export function getSupabaseClient(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for frontend Supabase reads.');
  }
  if (!client) {
    client = createClient(url, anonKey);
  }
  return client;
}
