import { requireSupabaseClient } from '../lib/supabase';
import type { Database, Tables, TablesInsert, TablesUpdate } from '../types/database.types';
import { calculateParticipationByMember } from '../utils/competitionAnalytics';

export type Competition = Tables<'competitions'>;
export type CompetitionInsert = TablesInsert<'competitions'>;
export type CompetitionUpdate = TablesUpdate<'competitions'>;

export interface CompetitionParticipation {
  user_id: string;
  username: string;
  full_name: string;
  competition_count: number;
}

export async function fetchCompetitions(): Promise<Competition[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('competitions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Gagal memuat daftar kompetisi: ${error.message}`);
  }

  return data ?? [];
}

export async function fetchCompetitionParticipation(): Promise<
  CompetitionParticipation[]
> {
  const client = requireSupabaseClient();
  const { data: memberships, error: membershipsError } = await client
    .from('competition_members')
    .select('user_id');

  if (membershipsError) {
    throw new Error(
      `Gagal memuat keikutsertaan anggota: ${membershipsError.message}`
    );
  }

  const userIds = [...new Set((memberships ?? []).map((membership) => membership.user_id))];
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await client
    .from('profiles')
    .select('id, username, full_name')
    .in('id', userIds);

  if (profilesError) {
    throw new Error(
      `Gagal memuat profil peserta kompetisi: ${profilesError.message}`
    );
  }

  return calculateParticipationByMember(memberships ?? [], profiles ?? []);
}

export async function fetchCompetitionById(id: string): Promise<Competition | null> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('competitions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memuat detail kompetisi: ${error.message}`);
  }

  return data;
}

export async function createCompetition(
  payload: Omit<CompetitionInsert, 'id' | 'created_at' | 'updated_at'>
): Promise<Competition> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('competitions')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Gagal menambahkan kompetisi: ${error.message}`);
  }

  return data;
}

export async function updateCompetition(
  id: string,
  payload: CompetitionUpdate
): Promise<Competition> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('competitions')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Gagal memperbarui kompetisi: ${error.message}`);
  }

  return data;
}

export async function deleteCompetition(id: string): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.from('competitions').delete().eq('id', id);

  if (error) {
    throw new Error(`Gagal menghapus kompetisi: ${error.message}`);
  }
}

export interface CompetitionMemberInfo {
  id: string;
  user_id: string;
  competition_id: string;
  created_at: string;
  profile: {
    username: string;
    full_name: string;
    is_active: boolean;
  };
}

export async function fetchCompetitionMembers(
  competitionId: string
): Promise<CompetitionMemberInfo[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('competition_members')
    .select(`
      id,
      user_id,
      competition_id,
      created_at,
      profiles:user_id (
        username,
        full_name,
        is_active
      )
    `)
    .eq('competition_id', competitionId);

  if (error) {
    throw new Error(`Gagal memuat anggota kompetisi: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    competition_id: row.competition_id,
    created_at: row.created_at,
    profile: row.profiles || {
      username: 'unknown',
      full_name: 'Unknown User',
      is_active: true,
    },
  }));
}

export async function addMemberToCompetition(
  competitionId: string,
  userId: string
): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('competition_members')
    .insert({ competition_id: competitionId, user_id: userId });

  if (error) {
    throw new Error(`Gagal menambahkan anggota ke kompetisi: ${error.message}`);
  }
}

export async function removeMemberFromCompetition(
  competitionId: string,
  userId: string
): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client
    .from('competition_members')
    .delete()
    .eq('competition_id', competitionId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Gagal menghapus anggota dari kompetisi: ${error.message}`);
  }
}

export async function copyCompetitionMembers(
  sourceCompId: string,
  targetCompId: string
): Promise<number> {
  const client = requireSupabaseClient();
  const sourceMembers = await fetchCompetitionMembers(sourceCompId);
  const targetMembers = await fetchCompetitionMembers(targetCompId);
  const existingUserIds = new Set(targetMembers.map((m) => m.user_id));

  const toAdd = sourceMembers
    .filter((m) => !existingUserIds.has(m.user_id))
    .map((m) => ({
      competition_id: targetCompId,
      user_id: m.user_id,
    }));

  if (toAdd.length === 0) return 0;

  const { error } = await client.from('competition_members').insert(toAdd);
  if (error) {
    throw new Error(`Gagal menyalin anggota kompetisi: ${error.message}`);
  }

  return toAdd.length;
}

export interface ActivityLogItem {
  id: string;
  competition_id: string;
  task_id: string | null;
  actor_id: string | null;
  action: string;
  details: any;
  created_at: string;
  actor?: {
    username: string;
    full_name: string;
  } | null;
}

export async function fetchCompetitionActivityLogs(
  competitionId: string
): Promise<ActivityLogItem[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('activity_logs')
    .select(`
      id,
      competition_id,
      task_id,
      actor_id,
      action,
      details,
      created_at,
      actor:profiles!activity_logs_actor_id_fkey (username, full_name)
    `)
    .eq('competition_id', competitionId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    // If activity_logs table is empty or error, return empty array gracefully
    return [];
  }

  return (data || []) as unknown as ActivityLogItem[];
}
