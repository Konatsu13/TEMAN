import { requireSupabaseClient } from '../lib/supabase';
import { isAIQueryResult, type AIQueryResult } from '../utils/aiQueryResult';

export type { AIQueryResult } from '../utils/aiQueryResult';

export async function askAIQuery(question: string): Promise<AIQueryResult> {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<unknown>('ai-query', {
    body: { question },
  });

  if (error) {
    throw new Error(`Asisten AI tidak dapat memproses pertanyaan: ${error.message}`);
  }
  if (!isAIQueryResult(data)) {
    throw new Error('Asisten AI mengembalikan format jawaban yang tidak valid.');
  }

  return data;
}
