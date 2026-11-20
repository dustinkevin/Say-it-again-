import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';

function getServerEnv(key: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  if (proc?.env?.[key]) {
    return proc.env[key];
  }
  const viteEnv = import.meta.env as Record<string, string | undefined> | undefined;
  return viteEnv?.[key];
}

export async function createClient(cookieMethods?: CookieMethodsServer) {
  const supabaseUrl =
    getServerEnv('NEXT_PUBLIC_SUPABASE_URL') || getServerEnv('VITE_SUPABASE_URL');
  const supabaseKey =
    getServerEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    getServerEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    getServerEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    getServerEnv('VITE_SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase URL or Key environment variables (NEXT_PUBLIC_SUPABASE_URL / VITE_SUPABASE_URL).'
    );
  }

  const cookies: CookieMethodsServer = cookieMethods ?? {
    getAll() {
      return [];
    },
    setAll() {
      // No-op fallback when no server cookie adapter is provided
    },
  };

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies,
  });
}
