import { requireSupabaseClient } from '../lib/supabase';
import { isAIQueryResult, type AIQueryResult } from '../utils/aiQueryResult';

export type { AIQueryResult } from '../utils/aiQueryResult';

export async function askAIQuery(question: string): Promise<AIQueryResult> {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<unknown>('ai-query', {
    body: { question },
  });

  if (error) {
    if (error.message.includes('Failed to send a request')) {
      throw new Error(
        'Edge Function ai-query belum dapat dihubungi. Pastikan fungsi sudah di-deploy ke project Supabase yang dipakai aplikasi.'
      );
    }
    throw new Error(`Asisten AI tidak dapat memproses pertanyaan: ${error.message}`);
  }
  if (!isAIQueryResult(data)) {
    throw new Error('Asisten AI mengembalikan format jawaban yang tidak valid.');
  }

  return data;
}
