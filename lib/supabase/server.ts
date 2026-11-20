import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';

function getProcessEnv(key: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[key];
}

export async function createClient(cookieMethods?: CookieMethodsServer) {
  const supabaseUrl =
    getProcessEnv('NEXT_PUBLIC_SUPABASE_URL') ||
    getProcessEnv('VITE_SUPABASE_URL') ||
    import.meta.env?.NEXT_PUBLIC_SUPABASE_URL ||
    import.meta.env?.VITE_SUPABASE_URL;

  const supabaseKey =
    getProcessEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    getProcessEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    getProcessEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    getProcessEnv('VITE_SUPABASE_ANON_KEY') ||
    import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    import.meta.env?.VITE_SUPABASE_ANON_KEY;

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
