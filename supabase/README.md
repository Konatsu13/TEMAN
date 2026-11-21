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

## 6. Global Chat & AI Mention

Global Chat adalah satu kanal publik untuk seluruh anggota aktif. Jalankan migration berikut melalui **Supabase SQL Editor** setelah meninjaunya:

- `supabase/migrations/002_global_chat.sql`
  - Membuat tabel `public.chat_messages` (pesan manusia dan balasan AI).
  - Menambahkan index waktu, index unik satu balasan AI per pesan, serta constraint panjang pesan.
  - Mengaktifkan RLS: anggota aktif dapat membaca; penulis hanya dapat menulis/mengedit pesannya sendiri; balasan AI hanya boleh dibuat oleh penulis pesan yang menyebut `@ai`/`@teman`; penulis dan Owner dapat menghapus.
  - Membuat helper RLS `is_valid_chat_ai_reply` untuk memvalidasi balasan AI.
  - Membuat helper `notify_chat_mentions` untuk notifikasi in-app dari pesan yang sesungguhnya ditulis pengguna.
  - Menambahkan tabel ke publication `supabase_realtime` untuk sinkronisasi INSERT/UPDATE/DELETE.

Migration ini **tidak dijalankan otomatis** oleh repository. Tanpa migration, halaman `/chat` akan menampilkan instruksi setup.

### Edge Function `chat-ai`

`chat-ai` menerima `message_id`, memverifikasi sesi dan kepemilikan pesan, memuat konteks workspace yang boleh diakses pemanggil, memanggil Gemini untuk pertanyaan umum, lalu menyimpan satu balasan AI. Pertanyaan analitik diteruskan ke `ai-query`, yang hanya menjalankan query baca-terbatas yang sudah ditentukan menggunakan token pengguna; model tidak menghasilkan SQL yang dieksekusi langsung. `GEMINI_API_KEY` hanya berada di server.

1. Gunakan `GEMINI_API_KEY`, `GEMINI_MODEL`, dan `APP_URL` dari setup AI di atas pada `.env` root.
2. Jalankan `supabase functions serve chat-ai --env-file .env`. Jika ingin NL2SQL analitik, jalankan `supabase functions serve ai-query --env-file .env` pada terminal terpisah.
3. Untuk production, atur secrets dan deploy kedua function:

```powershell
supabase secrets set GEMINI_API_KEY=your-key GEMINI_MODEL=gemini-3.5-flash-lite APP_URL=https://your-app.example
supabase functions deploy ai-query
supabase functions deploy chat-ai
```

Jangan menaruh `GEMINI_API_KEY` di variabel `VITE_*` atau commit ke repository. `SUPABASE_URL` dan `SUPABASE_ANON_KEY` tetap disediakan oleh lingkungan Edge Function. Tanpa `ai-query`, percakapan umum tetap berfungsi, tetapi pertanyaan analitik workspace tidak tersedia.

## 7. Theme Presets & Profile Background

Review and run `supabase/migrations/003_theme_presets_and_profile_background.sql` manually in the Supabase SQL Editor. It adds `theme_preset` and `profile_background_color` to `public.profiles`, validates both values, and restricts preference updates to the signed-in user's own profile. The repository does not apply this migration automatically; profile preference sync will fail until it has been run.

## 8. Web Push & Reminder Notifications

The app keeps its existing notification sources. `send-push` is used by the “Uji Coba” button and to forward a notification received through Realtime to the user's other subscribed devices. No additional database migration or Supabase Vault setup is needed.

1. Generate a VAPID key pair, for example with `npx --yes web-push generate-vapid-keys --json`.
2. Put the matching public key in the root `.env` as `VITE_VAPID_PUBLIC_KEY`. This value is public, but must match the server key.
3. Configure the VAPID keys as Edge Function secrets and deploy the sender:

```powershell
supabase secrets set VAPID_PUBLIC_KEY=your-public-key VAPID_PRIVATE_KEY=your-private-key VAPID_SUBJECT=mailto:admin@example.com APP_URL=https://your-app.example
supabase functions deploy send-push
```

4. On each phone/browser that should receive pushes, sign in to the same TEMAN account, grant notification permission, and enable Web Push once. The “Uji Coba” button then sends a server-side push to every device registered to that account.

Automatic cross-device forwarding of a new notification requires at least one signed-in app session for that recipient to be connected to Realtime. A database webhook/Vault setup would be needed to send automatically when all app sessions are closed.

The MP3 at `assets/notification.mp3` plays for mention/deadline notifications while the app page is open. Web Push displayed while the app is backgrounded or closed uses the browser/operating system's notification sound; the Web Notifications API does not allow a service worker to select a custom MP3.
