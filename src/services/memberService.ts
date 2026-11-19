import { requireSupabaseClient } from '../lib/supabase';
import type { AppRole } from '../types/database.types';

export interface MemberListItem {
  id: string;
  username: string;
  full_name: string;
  is_active: boolean;
  role: AppRole;
  created_at: string;
}

export async function fetchMembersWithRoles(): Promise<MemberListItem[]> {
  const client = requireSupabaseClient();

  const [profilesRes, rolesRes] = await Promise.all([
    client.from('profiles').select('*').order('created_at', { ascending: true }),
    client.from('user_roles').select('*'),
  ]);

  if (profilesRes.error) {
    throw new Error(`Gagal memuat profil pengguna: ${profilesRes.error.message}`);
  }

  const rolesMap = new Map<string, AppRole>();
  (rolesRes.data || []).forEach((r) => {
    rolesMap.set(r.user_id, r.role);
  });

  return (profilesRes.data || []).map((p) => ({
    id: p.id,
    username: p.username,
    full_name: p.full_name,
    is_active: p.is_active,
    role: rolesMap.get(p.id) || 'member',
    created_at: p.created_at,
  }));
}

export async function toggleMemberActive(
  userId: string,
  isActive: boolean
): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('profiles')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    throw new Error(`Gagal mengubah status aktif pengguna: ${error.message}`);
  }
}

/**
 * Supabase functions.invoke only exposes a generic message for non-2xx
 * responses. The raw Response is available on `error.context`, so read the
 * function's `{ error }` payload to surface something actionable.
 */
async function readFunctionError(error: unknown): Promise<string> {
  const fallback =
    error instanceof Error && error.message.trim()
      ? error.message
      : 'Terjadi kesalahan yang tidak diketahui.';
  const context = (error as { context?: unknown } | null)?.context;

  if (typeof Response !== 'undefined' && context instanceof Response) {
    try {
      const payload = (await context.clone().json()) as {
        error?: unknown;
        message?: unknown;
      };
      const message =
        typeof payload?.error === 'string'
          ? payload.error
          : typeof payload?.message === 'string'
            ? payload.message
            : '';
      if (message.trim()) return message.trim();
    } catch {
      // Body is not JSON; keep the fallback.
    }
  }

  if (/failed to send a request|failed to fetch|networkerror/i.test(fallback)) {
    return 'Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.';
  }
  return fallback;
}

async function invokeMemberFunction(
  name: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<Record<string, unknown>>(
    name,
    { body }
  );

  if (error) {
    throw new Error(await readFunctionError(error));
  }
  if (data && typeof data.error === 'string') {
    throw new Error(data.error);
  }
  return data ?? {};
}

export interface CreateMemberPayload {
  username: string;
  full_name: string;
  password: string;
}

export async function createMemberAccount(
  payload: CreateMemberPayload
): Promise<void> {
  await invokeMemberFunction('create-member', { ...payload });
}

export interface UpdateMemberPayload {
  userId: string;
  full_name: string;
  username: string;
  password?: string;
}

export async function updateMemberAccount(
  payload: UpdateMemberPayload
): Promise<void> {
  await invokeMemberFunction('manage-member', {
    action: 'update',
    user_id: payload.userId,
    full_name: payload.full_name,
    username: payload.username,
    ...(payload.password ? { password: payload.password } : {}),
  });
}

export async function deleteMemberAccount(userId: string): Promise<void> {
  await invokeMemberFunction('manage-member', {
    action: 'delete',
    user_id: userId,
  });
}
