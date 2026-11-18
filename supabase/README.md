# Setup Supabase TEMAN (Phase 1)

## 1. Environment Variables
Salin `.env.example` menjadi `.env` di root proyek dan isi nilai dari Supabase Project Settings → API:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (atau anon key proyek)
- `VITE_AUTH_EMAIL_DOMAIN` (opsional, default `teman.local` jika memakai format email internal `<username>@teman.local`)

> Jangan pernah menaruh `service_role` key atau password database di frontend maupun di dalam repository.

## 2. Pengetatan RLS & Storage Bucket
Jalankan isi `supabase/migrations/001_phase1_rls_and_bootstrap.sql` melalui **Supabase SQL Editor** setelah meninjaunya:
- Memperketat `SELECT` RLS pada `competition_members`, `tasks`, `task_comments`, `task_attachments`, `calendar_events`, dan `activity_logs` agar Member hanya bisa membaca workspace kompetisi yang diikutinya.
- Membuat private Storage bucket `task-attachments` beserta policy akses menggunakan fungsi `can_access_attachment_path`.

## 3. Membuat Akun Owner Pertama
1. Buka **Supabase Dashboard → Authentication → Users → Add user**.
2. Gunakan email internal seperti `<username>@teman.local` (atau email asli bila nanti memakai Edge Function `login-username`), isi password yang kuat, dan aktifkan **Auto Confirm User**.
3. Salin **User UID** hasil pembuatan, lalu isi ke query `INSERT INTO public.profiles` dan `INSERT INTO public.user_roles` di bagian akhir `001_phase1_rls_and_bootstrap.sql`.

## 4. Catatan Skema vs Spesifikasi
Berdasarkan inspeksi `DATABASE_CONTEXT.md` dan `database.types.ts`:
- `competitions` memiliki satu kolom `objective` (belum ada kolom terpisah `team_objective`). Pada Phase 2 kita bisa memetakan `objective` untuk tujuan kompetisi/tim atau menambah kolom `team_objective` melalui migration jika diinginkan.
- `notification_type` enum bernilai `'mention' | 'assignment' | 'comment' | 'deadline'`. Jika pengingat event kalender ingin dipisah dari `'deadline'`, kita dapat menambah nilai enum `'reminder'` pada Phase 5.
- Untuk pembuatan akun Member oleh Owner tanpa memutus sesi Owner aktif (Phase 2) dan login username dengan email asli, kita akan menambahkan Supabase Edge Functions (`login-username` dan `create-member`) yang memakai `SUPABASE_SERVICE_ROLE_KEY` secara aman di sisi server Supabase.

## 5. Asisten AI Analitik
Edge Function `ai-query` memakai Gemini untuk memilih intent dari daftar analitik yang diizinkan, lalu menjalankan query baca-terbatas dengan token pengguna yang sedang login. Function tidak menjalankan SQL yang dihasilkan AI dan tidak memakai service-role key.

Sebelum memakai fitur:
1. Untuk local testing, isi `GEMINI_API_KEY` dan `GEMINI_MODEL` pada `.env` root, lalu jalankan `supabase functions serve ai-query --env-file .env` dengan Supabase local.
2. Untuk production, atur `GEMINI_API_KEY`, `GEMINI_MODEL`, dan `APP_URL` melalui Supabase Edge Function secrets.
3. Deploy dengan `supabase functions deploy ai-query`.

`SUPABASE_URL` dan `SUPABASE_ANON_KEY` disediakan oleh lingkungan Edge Function. RLS tetap diterapkan pada query; Member juga dibatasi secara eksplisit ke kompetisi yang tercatat pada `competition_members`. Tidak ada migration database yang diperlukan.
