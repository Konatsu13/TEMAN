import { requireSupabaseClient } from '../lib/supabase';
import { isAIQueryResult, type AIQueryResult } from '../utils/aiQueryResult';

export type { AIQueryResult } from '../utils/aiQueryResult';

async function readInvokeErrorMessage(error: unknown): Promise<string> {
  const fallback =
    error instanceof Error && error.message.trim()
      ? error.message
      : 'Terjadi kesalahan yang tidak diketahui.';

  // supabase-js exposes the raw Response of non-2xx Edge Function calls on
  // `error.context`. The function returns `{ error: "..." }`, which is far more
  // useful to the user than the generic "non-2xx status code" message.
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
    return 'Fitur AI belum aktif di server: Edge Function "ai-query" belum di-deploy. Hubungi Owner workspace untuk mengaktifkannya.';
  }
  if (/failed to send a request|failed to fetch|networkerror/i.test(message)) {
    return 'Tidak dapat menghubungi server AI. Periksa koneksi internet lalu coba lagi.';
  }
  if (status === 401 || /sesi login tidak valid|sesi login diperlukan/i.test(message)) {
    return 'Sesi login Anda sudah berakhir. Silakan masuk kembali untuk memakai asisten AI.';
  }
  return message;
}

export async function askAIQuery(question: string): Promise<AIQueryResult> {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<unknown>('ai-query', {
    body: { question },
  });

  if (error) {
    const status = (error as { context?: Response }).context?.status;
    const message = friendlyMessage(await readInvokeErrorMessage(error), status);
    throw new Error(message);
  }
  if (!isAIQueryResult(data)) {
    throw new Error('Asisten AI mengembalikan format jawaban yang tidak valid.');
  }

  return data;
}
