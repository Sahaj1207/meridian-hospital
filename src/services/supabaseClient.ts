import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_URL : undefined);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_ANON_KEY : undefined);

const isSchedulingUnitTest = typeof process !== 'undefined' && Boolean(
  process.argv && process.argv.some((arg) => arg.includes('unit-test') || arg.includes('scheduling.test'))
);

export const isSupabaseConfigured = !isSchedulingUnitTest && Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder') &&
  supabaseAnonKey !== 'your-anon-key-here' &&
  !supabaseAnonKey.includes('placeholder')
);

export const isProductionEnvironment = (): boolean => {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
    return true;
  }
  return Boolean(import.meta.env.PROD);
};

/**
 * Validates the runtime environment.
 * Production deployments MUST have valid Supabase credentials configured.
 * Development and test environments are permitted to use deterministic local stores.
 */
export function assertSupabaseEnvironment(): void {
  if (isProductionEnvironment() && !isSupabaseConfigured) {
    throw new Error(
      'Production requires valid Supabase environment configuration (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY). Local in-memory fallback is disabled in production.'
    );
  }
}


let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured && supabaseUrl && supabaseAnonKey) {
  try {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  } catch (err) {
    console.warn('Supabase initialization deferred: invalid URL configuration.', err);
    clientInstance = null;
  }
}

/**
 * Returns the active Supabase client instance, or null if credentials have not yet been provided.
 */
export function getSupabaseClient(): SupabaseClient | null {
  return clientInstance;
}
