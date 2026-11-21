import { requireSupabaseClient } from '../lib/supabase';
import type { ChatMessage } from './chatService';

interface ChatAIReplyPayload {
  message: ChatMessage;
  model?: string;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;

  return (
    typeof message.id === 'string' &&
    typeof message.content === 'string' &&
    typeof message.is_ai === 'boolean' &&
    typeof message.created_at === 'string' &&
    (message.author_id === null || typeof message.author_id === 'string') &&
    (message.reply_to_id === null || typeof message.reply_to_id === 'string') &&
    (message.edited_at === null || typeof message.edited_at === 'string')
  );
}

function isChatAIReplyPayload(value: unknown): value is ChatAIReplyPayload {
  if (!value || typeof value !== 'object') return false;
  return isChatMessage((value as Record<string, unknown>).message);
}

async function readInvokeErrorMessage(error: unknown): Promise<string> {
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
      // Response body is not JSON (or already consumed); use the fallback.
    }
  }

  return fallback;
}

function friendlyMessage(message: string, status?: number): string {
  if (
    status === 404 ||
    /requested function was not found|function was not found/i.test(message)
  ) {
    return 'Fitur AI chat belum aktif di server: Edge Function "chat-ai" belum di-deploy. Hubungi Owner workspace untuk mengaktifkannya.';
  }
  if (/failed to send a request|failed to fetch|networkerror/i.test(message)) {
    return 'Tidak dapat menghubungi layanan AI. Periksa koneksi internet lalu coba lagi.';
  }
  if (status === 401 || /sesi login tidak valid|sesi login diperlukan/i.test(message)) {
    return 'Sesi login Anda sudah berakhir. Silakan masuk kembali untuk memakai AI chat.';
  }
  return message;
}

/**
 * Asks the chat-ai Edge Function to answer a user message that mentions @ai.
 * The Edge Function calls Gemini server-side, persists the reply, and returns it.
 * The Gemini key never reaches the browser.
 */
export async function requestChatAIReply(messageId: string): Promise<ChatMessage> {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<unknown>('chat-ai', {
    body: { message_id: messageId },
  });

  if (error) {
    const status = (error as { context?: Response }).context?.status;
    const message = friendlyMessage(await readInvokeErrorMessage(error), status);
    throw new Error(message);
  }
  if (!isChatAIReplyPayload(data)) {
    throw new Error('Layanan AI mengembalikan format jawaban yang tidak valid.');
  }

  return data.message;
}
