import { createBrowserClient } from '@supabase/ssr';

function getProcessEnv(key: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[key];
}

export function getSupabaseConfig(): { url?: string; key?: string } {
  // Static import.meta.env property accesses are required so Vite inlines them in production builds
  const url =
    import.meta.env?.NEXT_PUBLIC_SUPABASE_URL ||
    import.meta.env?.VITE_SUPABASE_URL ||
    getProcessEnv('NEXT_PUBLIC_SUPABASE_URL') ||
    getProcessEnv('VITE_SUPABASE_URL');

  const key =
    import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    import.meta.env?.VITE_SUPABASE_ANON_KEY ||
    getProcessEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    getProcessEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    getProcessEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    getProcessEnv('VITE_SUPABASE_ANON_KEY');

  return {
    url: url?.trim() || undefined,
    key: key?.trim() || undefined,
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key);
}

export function createClient() {
  const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase URL or Key environment variables (NEXT_PUBLIC_SUPABASE_URL / VITE_SUPABASE_URL).'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
