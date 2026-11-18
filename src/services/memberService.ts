import { requireSupabaseClient } from '../lib/supabase';
import type { AppRole, Tables } from '../types/database.types';

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

export interface CreateMemberPayload {
  username: string;
  full_name: string;
  password: string;
}

export async function createMemberAccount(
  payload: CreateMemberPayload
): Promise<void> {
  const client = requireSupabaseClient();

  // Try calling Supabase Edge Function 'create-member'
  const fnResult = await client.functions.invoke<{
    success?: boolean;
    error?: string;
  }>('create-member', {
    body: payload,
  });

  if (fnResult.error || fnResult.data?.error) {
    const errText = fnResult.data?.error || fnResult.error?.message;
    throw new Error(
      errText ||
        'Edge Function create-member belum terpasang di Supabase. Anda dapat menambahkan user via Supabase Dashboard -> Authentication.'
    );
  }
}
