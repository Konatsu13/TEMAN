import { requireSupabaseClient } from '../lib/supabase';
import type { AppRole, Tables } from '../types/database.types';
import { friendlyChatError } from '../utils/chatErrors';

export type ChatMessageRow = Tables<'chat_messages'>;

export interface ChatAuthor {
  id: string;
  username: string;
  full_name: string;
  role?: AppRole | null;
}

export interface ChatMessage extends ChatMessageRow {
  author?: ChatAuthor | null;
}

export interface ChatParticipant extends ChatAuthor {
  role: AppRole | null;
}

const CHAT_MESSAGE_SELECT = `
  id,
  author_id,
  content,
  is_ai,
  reply_to_id,
  edited_at,
  created_at,
  author:profiles!chat_messages_author_id_fkey (id, username, full_name)
`;

const MAX_MESSAGE_LENGTH = 2000;

function assertContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Pesan tidak boleh kosong.');
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Pesan maksimal ${MAX_MESSAGE_LENGTH} karakter.`);
  }
  return trimmed;
}

function chatError(action: string, error: { message: string }): Error {
  return new Error(friendlyChatError(new Error(`${action}: ${error.message}`)));
}

/**
 * Loads the latest messages in ascending order so the chat list can render
 * naturally from top to bottom.
 */
export async function fetchChatMessages(limit = 150): Promise<ChatMessage[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('chat_messages')
    .select(CHAT_MESSAGE_SELECT)
    .order('created_at', { ascending: false })
    .limit(Math.max(1, Math.min(limit, 300)));

  if (error) {
    throw chatError('Gagal memuat pesan Global Chat', error);
  }

  return ((data || []) as unknown as ChatMessage[]).slice().reverse();
}

export async function fetchChatMessageById(id: string): Promise<ChatMessage | null> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('chat_messages')
    .select(CHAT_MESSAGE_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw chatError('Gagal memuat pesan', error);
  }

  return (data as unknown as ChatMessage | null) ?? null;
}

export async function sendChatMessage(
  authorId: string,
  content: string,
  replyToId?: string | null
): Promise<ChatMessage> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('chat_messages')
    .insert({
      author_id: authorId,
      content: assertContent(content),
      is_ai: false,
      reply_to_id: replyToId ?? null,
    })
    .select(CHAT_MESSAGE_SELECT)
    .single();

  if (error) {
    throw chatError('Gagal mengirim pesan', error);
  }

  return data as unknown as ChatMessage;
}

export async function editChatMessage(
  id: string,
  content: string
): Promise<ChatMessage> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('chat_messages')
    .update({
      content: assertContent(content),
      edited_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(CHAT_MESSAGE_SELECT)
    .single();

  if (error) {
    throw chatError('Gagal memperbarui pesan', error);
  }

  return data as unknown as ChatMessage;
}

export async function deleteChatMessage(id: string): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.from('chat_messages').delete().eq('id', id);

  if (error) {
    throw chatError('Gagal menghapus pesan', error);
  }
}

/**
 * Active profiles plus their workspace role, used for mention autocomplete and
 * the online member panel.
 */
export async function fetchChatParticipants(): Promise<ChatParticipant[]> {
  const client = requireSupabaseClient();
  const [profilesResult, rolesResult] = await Promise.all([
    client
      .from('profiles')
      .select('id, username, full_name, is_active')
      .eq('is_active', true)
      .order('full_name', { ascending: true }),
    client.from('user_roles').select('user_id, role'),
  ]);

  if (profilesResult.error) {
    throw chatError('Gagal memuat anggota untuk mention', {
      message: profilesResult.error.message,
    });
  }

  const roles = new Map<string, AppRole>();
  if (!rolesResult.error) {
    for (const row of rolesResult.data || []) {
      roles.set(row.user_id, row.role);
    }
  }

  return (profilesResult.data || []).map((profile) => ({
    id: profile.id,
    username: profile.username,
    full_name: profile.full_name,
    role: roles.get(profile.id) ?? null,
  }));
}

/**
 * Best-effort in-app notifications for @username mentions in the global room.
 * Chat mentions have no task/competition context; the notifications page sends
 * these users back to /chat.
 *
 * The RPC resolves recipients from the stored message content and only accepts
 * message ids owned by the calling user, so the client cannot choose recipients
 * or send notifications without an actual chat message.
 */
export async function notifyChatMentions(messageId: string): Promise<void> {
  const client = requireSupabaseClient();

  try {
    await client.rpc('notify_chat_mentions', {
      p_message_id: messageId,
    });
  } catch {
    // Mention notifications must never block the chat message itself.
  }
}
