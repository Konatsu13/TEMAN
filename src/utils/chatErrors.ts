/**
 * Maps Supabase/PostgREST failures from the Global Chat feature to messages an
 * active member can act on. Missing migrations and RLS problems are the two
 * setup states the UI must explain instead of showing raw database errors.
 */
export function friendlyChatError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : 'Gagal memuat Global Chat.';

  if (
    /chat_messages.*does not exist|relation .*chat_messages.*does not exist|42P01|PGRST205|could not find the table.*chat_messages|schema cache.*chat_messages/i.test(
      message
    )
  ) {
    return 'Tabel chat_messages belum tersedia. Jalankan migration supabase/migrations/002_global_chat.sql melalui Supabase SQL Editor, lalu muat ulang halaman ini.';
  }
  if (/row-level security|permission denied|42501/i.test(message)) {
    return 'Akun ini belum memiliki izin untuk membuka ruang diskusi. Pastikan migration Global Chat dan RLS sudah diterapkan serta akun Anda aktif.';
  }

  return message;
}
