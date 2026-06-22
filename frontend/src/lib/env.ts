/**
 * Frontend env safety — only VITE_* vars are exposed to the browser.
 * Never put SUPABASE_SERVICE_ROLE_KEY or other secrets here.
 */

const FORBIDDEN_VITE_FRAGMENTS = ['SERVICE_ROLE', 'SECRET', 'PRIVATE', 'PASSWORD'] as const;

const ALLOWED_VITE_KEYS = new Set([
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_API_BASE_URL',
  'VITE_DEV_SERVER_URL',
]);

/** Call once at startup to catch misconfigured secrets in the client bundle. */
export function assertSafeFrontendEnv(): void {
  const env = import.meta.env as Record<string, string | boolean | undefined>;

  for (const key of Object.keys(env)) {
    if (!key.startsWith('VITE_')) continue;
    const upper = key.toUpperCase();
    if (FORBIDDEN_VITE_FRAGMENTS.some((frag) => upper.includes(frag))) {
      throw new Error(
        `${key} must not be set in the frontend. Use VITE_SUPABASE_ANON_KEY only (RLS-protected).`,
      );
    }
    if (import.meta.env.DEV && !ALLOWED_VITE_KEYS.has(key) && env[key] !== undefined) {
      console.warn(`[env] Unexpected VITE_ variable: ${key}`);
    }
  }
}

export function getApiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (typeof base === 'string' && base.trim()) return base.trim().replace(/\/$/, '');
  return '/api';
}
