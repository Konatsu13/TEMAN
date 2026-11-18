import type { Session, User } from '@supabase/supabase-js';
import {
  isSupabaseConfigured,
  requireSupabaseClient,
  supabaseEnv,
} from '../lib/supabase';
import type { AppRole, Tables, UserSessionProfile } from '../types/database.types';
import { buildInternalAuthEmail, normalizeUsername } from '../utils/authValidation';

export interface AuthSignInResponse {
  session: Session;
  user: User;
  userProfile: UserSessionProfile;
}

function mapAuthErrorMessage(rawMessage: string): string {
  const lower = rawMessage.toLowerCase();
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_credentials')
  ) {
    return 'Username atau kata sandi tidak sesuai.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Akun belum terkonfirmasi di Supabase Auth. Pastikan konfirmasi email diaktifkan oleh admin.';
  }
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Terlalu banyak percobaan masuk. Silakan tunggu sebentar lalu coba lagi.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Gagal terhubung ke server Supabase. Periksa koneksi internet dan URL Supabase Anda.';
  }
  return rawMessage;
}

export async function fetchUserSessionProfile(
  userId: string
): Promise<UserSessionProfile> {
  const client = requireSupabaseClient();

  const [profileRes, roleRes] = await Promise.all([
    client
      .from('profiles')
      .select('id, username, full_name, is_active, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle(),
    client
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (profileRes.error) {
    throw new Error(`Gagal memuat profil pengguna: ${profileRes.error.message}`);
  }
  if (!profileRes.data) {
    throw new Error(
      'Profil pengguna belum ditemukan di tabel profiles. Hubungi Owner workspace.'
    );
  }
  const profile = profileRes.data as Tables<'profiles'>;

  if (!profile.is_active) {
    await client.auth.signOut();
    throw new Error('Akun Anda sedang dinonaktifkan. Hubungi Owner workspace.');
  }

  if (roleRes.error) {
    throw new Error(`Gagal memuat role pengguna: ${roleRes.error.message}`);
  }

  const role: AppRole = roleRes.data?.role === 'owner' ? 'owner' : 'member';

  return { profile, role };
}

export async function signInWithUsername(
  usernameInput: string,
  password: string
): Promise<AuthSignInResponse> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Koneksi Supabase belum dikonfigurasi. Lengkapi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY di file .env.'
    );
  }

  const client = requireSupabaseClient();
  const normalizedUsername = normalizeUsername(usernameInput);

  let session: Session | null = null;
  let user: User | null = null;

  // 1. Try Edge Function 'login-username' first (supports real email mappings securely server-side)
  try {
    const fnResult = await client.functions.invoke<{
      session?: { access_token: string; refresh_token: string };
      error?: string;
    }>('login-username', {
      body: { username: normalizedUsername, password },
    });

    if (!fnResult.error && fnResult.data?.session) {
      const setSessionRes = await client.auth.setSession({
        access_token: fnResult.data.session.access_token,
        refresh_token: fnResult.data.session.refresh_token,
      });
      if (setSessionRes.error) {
        throw new Error(mapAuthErrorMessage(setSessionRes.error.message));
      }
      session = setSessionRes.data.session;
      user = setSessionRes.data.user;
    } else if (fnResult.data?.error) {
      throw new Error(mapAuthErrorMessage(fnResult.data.error));
    }
  } catch (err) {
    // If Edge Function explicitly returned an auth error, rethrow it;
    // otherwise fall back to deterministic internal email convention (<username>@<domain>).
    if (
      err instanceof Error &&
      !err.message.includes('FunctionsFetchError') &&
      !err.message.includes('FunctionsHttpError') &&
      !err.message.includes('Failed to send a request') &&
      !err.message.includes('Edge Function')
    ) {
      throw err;
    }
  }

  // 2. Fallback to deterministic internal auth email
  if (!session || !user) {
    const domain = supabaseEnv.authEmailDomain || 'teman.local';
    const cleanNoSpaces = normalizedUsername.replace(/[^a-z0-9]/g, '');
    const cleanWithDot = normalizedUsername.replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');

    const candidateEmails = Array.from(
      new Set([
        cleanNoSpaces ? `${cleanNoSpaces}@${domain}` : null,
        cleanWithDot ? `${cleanWithDot}@${domain}` : null,
        `${normalizedUsername}@${domain}`,
      ])
    ).filter(Boolean) as string[];

    let lastError: any = null;
    for (const email of candidateEmails) {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (!error && data.session && data.user) {
        session = data.session;
        user = data.user;
        break;
      }
      lastError = error;
    }

    if (!session || !user) {
      throw new Error(
        mapAuthErrorMessage(lastError?.message ?? 'Nama atau kata sandi tidak sesuai.')
      );
    }
  }

  const userProfile = await fetchUserSessionProfile(user.id);

  return {
    session,
    user,
    userProfile,
  };
}

export async function signOutCurrentUser(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const client = requireSupabaseClient();
  const { error } = await client.auth.signOut();
  if (error) {
    throw new Error(`Gagal keluar dari sesi: ${error.message}`);
  }
}
