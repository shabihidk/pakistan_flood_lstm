/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL (public). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon key only — never the service role key. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** API base path, e.g. /api (proxied to Flask in dev). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
