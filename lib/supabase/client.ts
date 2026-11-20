import { createBrowserClient } from '@supabase/ssr';

function getEnv(key: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  if (proc?.env?.[key]) {
    return proc.env[key];
  }
  const viteEnv = import.meta.env as Record<string, string | undefined> | undefined;
  return viteEnv?.[key];
}

export function createClient() {
  const supabaseUrl =
    getEnv('NEXT_PUBLIC_SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const supabaseKey =
    getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    getEnv('VITE_SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase URL or Key environment variables (NEXT_PUBLIC_SUPABASE_URL / VITE_SUPABASE_URL).'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
