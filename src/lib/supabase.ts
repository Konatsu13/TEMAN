import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import { resolveSupabaseEnv } from '../utils/supabaseEnv';

export const supabaseEnv = resolveSupabaseEnv({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_AUTH_EMAIL_DOMAIN: import.meta.env.VITE_AUTH_EMAIL_DOMAIN,
});

export const isSupabaseConfigured = supabaseEnv.isConfigured;

let clientInstance: SupabaseClient<Database> | null = null;

if (supabaseEnv.isConfigured) {
  clientInstance = createClient<Database>(supabaseEnv.url, supabaseEnv.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = clientInstance;

export function requireSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      `Konfigurasi Supabase belum lengkap (${supabaseEnv.missingVars.join(', ')}).`
    );
  }
  return supabase;
}
