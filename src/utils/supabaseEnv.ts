export interface SupabaseEnvInput {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_AUTH_EMAIL_DOMAIN?: string;
}

export interface SupabaseConfigState {
  url: string;
  publishableKey: string;
  authEmailDomain: string;
  isConfigured: boolean;
  missingVars: string[];
}

const PLACEHOLDER_HOSTS = ['your-project-ref.supabase.co', 'example.supabase.co'];
const PLACEHOLDER_KEYS = ['your-supabase-publishable-or-anon-key', 'my_supabase_key'];

export function resolveSupabaseEnv(env: SupabaseEnvInput): SupabaseConfigState {
  const rawUrl = (env.VITE_SUPABASE_URL ?? '').trim();
  const rawKey = (
    env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    env.VITE_SUPABASE_ANON_KEY ??
    ''
  ).trim();
  const rawDomain = (env.VITE_AUTH_EMAIL_DOMAIN ?? 'teman.local').trim() || 'teman.local';

  const missingVars: string[] = [];

  const isUrlValid =
    rawUrl.length > 0 &&
    /^https?:\/\/.+/.test(rawUrl) &&
    !PLACEHOLDER_HOSTS.some((host) => rawUrl.includes(host));

  if (!isUrlValid) {
    missingVars.push('VITE_SUPABASE_URL');
  }

  const isKeyValid =
    rawKey.length > 0 &&
    !PLACEHOLDER_KEYS.some((placeholder) => rawKey.toLowerCase() === placeholder);

  if (!isKeyValid) {
    missingVars.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  }

  return {
    url: rawUrl,
    publishableKey: rawKey,
    authEmailDomain: rawDomain,
    isConfigured: isUrlValid && isKeyValid,
    missingVars,
  };
}
