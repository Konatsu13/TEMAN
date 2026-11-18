# TEMAN — Database Context

Dokumentasi ini dibuat dari inspeksi langsung Supabase project **Team Management** pada 18 November 2026.
Project ref: `xibgmucfyfvxllnajutg`
Schema yang diperiksa: `public`

## Tujuan dokumen
Gunakan dokumen ini sebagai referensi ketika mengembangkan aplikasi TEMAN. Struktur database di bawah mencerminkan kondisi Supabase saat diperiksa. Jangan membuat ulang tabel yang sudah ada, mengganti nama kolom, atau mengubah enum tanpa alasan dan persetujuan eksplisit.

## Ringkasan
- 11 tabel pada schema `public`.
- Semua 11 tabel mengaktifkan Row Level Security (RLS).
- Saat pemeriksaan, seluruh tabel menunjukkan 0 baris.
- 8 enum database.
- Fungsi database: `can_access_attachment_path`, `can_access_competition`, `can_access_task`, `generate_deadline_notifications`, `get_competition_stats`, `has_role`, `is_active_user`, `is_competition_member`, `is_owner`.
- Tiga catatan migrasi tercatat pada project.
- `profiles.id` terhubung ke `auth.users.id`; autentikasi tetap dikelola Supabase Auth.

## Tabel dan kolom

### `profiles`
Profil aplikasi yang terkait dengan akun Supabase Auth.
- `id` uuid, PK, FK → `auth.users.id`
- `username` text, unik, format dibatasi regex `^[a-z0-9_.]{3,30}$`
- `full_name` text
- `is_active` boolean, default `true`
- `created_at`, `updated_at` timestamptz, default `now()`

### `user_roles`
Role aplikasi terpisah dari identitas autentikasi.
- `id` uuid, PK, default `gen_random_uuid()`
- `user_id` uuid, FK → `auth.users.id`
- `role` enum `app_role`
- `created_at` timestamptz, default `now()`

### `competitions`
Informasi kompetisi.
- `id` uuid, PK, default `gen_random_uuid()`
- `name` text
- `organizer` text nullable
- `mode` enum `competition_mode`, default `online`
- `objective` text nullable
- `team_name` text nullable
- `deadline` timestamptz nullable
- `fee_type` enum `fee_type`, default `free`
- `fee_amount` numeric, default `0`, CHECK >= 0
- `instagram_url`, `guidebook_url`, `github_url`, `figma_url` text nullable
- `other_links` jsonb, default `[]`
- `status` enum `competition_status`, default `planning`
- `progress_mode` enum `progress_mode`, default `auto`
- `manual_progress` integer nullable, CHECK null atau 0–100
- `created_by` uuid nullable, FK → `profiles.id`
- `created_at`, `updated_at` timestamptz, default `now()`

### `competition_members`
Relasi many-to-many antara pengguna dan kompetisi.
- `id` uuid, PK, default `gen_random_uuid()`
- `competition_id` uuid, FK → `competitions.id`
- `user_id` uuid, FK → `profiles.id`
- `created_at` timestamptz, default `now()`

### `tasks`
Tugas di dalam kompetisi.
- `id` uuid, PK, default `gen_random_uuid()`
- `competition_id` uuid, FK → `competitions.id`
- `title` text
- `description` text nullable
- `status` enum `task_status`, default `todo`
- `assignee_id` uuid nullable, FK → `profiles.id`
- `due_date` timestamptz nullable
- `position` double precision, default `0`
- `completed_at` timestamptz nullable
- `created_by` uuid nullable, FK → `profiles.id`
- `created_at`, `updated_at` timestamptz, default `now()`

### `task_comments`
Komentar pada tugas.
- `id` uuid, PK, default `gen_random_uuid()`
- `task_id` uuid, FK → `tasks.id`
- `author_id` uuid nullable, FK → `profiles.id`
- `content` text, CHECK `length(btrim(content)) > 0`
- `created_at`, `updated_at` timestamptz, default `now()`

### `task_attachments`
Metadata file lampiran tugas.
- `id` uuid, PK, default `gen_random_uuid()`
- `task_id` uuid, FK → `tasks.id`
- `uploaded_by` uuid nullable, FK → `profiles.id`
- `file_name` text
- `file_path` text, unik
- `file_size` bigint, default `0`
- `mime_type` text nullable
- `created_at` timestamptz, default `now()`

### `calendar_events`
Kegiatan internal kalender.
- `id` uuid, PK, default `gen_random_uuid()`
- `competition_id` uuid nullable, FK → `competitions.id`
- `title` text
- `description` text nullable
- `event_type` enum `event_type`, default `meeting`
- `starts_at` timestamptz
- `ends_at` timestamptz nullable
- `location` text nullable
- `created_by` uuid nullable, FK → `profiles.id`
- `created_at`, `updated_at` timestamptz, default `now()`

### `activity_logs`
Catatan aktivitas dalam kompetisi.
- `id` uuid, PK, default `gen_random_uuid()`
- `competition_id` uuid, FK → `competitions.id`
- `task_id` uuid nullable, FK → `tasks.id`
- `actor_id` uuid nullable, FK → `profiles.id`
- `action` text
- `details` jsonb, default `{}`
- `created_at` timestamptz, default `now()`

### `notifications`
Notifikasi per pengguna.
- `id` uuid, PK, default `gen_random_uuid()`
- `user_id` uuid, FK → `profiles.id`
- `actor_id` uuid nullable, FK → `profiles.id`
- `type` enum `notification_type`
- `title` text
- `body` text nullable
- `competition_id` uuid nullable, FK → `competitions.id`
- `task_id` uuid nullable, FK → `tasks.id`
- `read_at`, `pushed_at` timestamptz nullable
- `dedupe_key` text nullable, unik
- `created_at` timestamptz, default `now()`

### `push_subscriptions`
Endpoint Web Push milik pengguna.
- `id` uuid, PK, default `gen_random_uuid()`
- `user_id` uuid, FK → `profiles.id`
- `endpoint` text
- `p256dh` text
- `auth` text
- `user_agent` text nullable
- `created_at` timestamptz, default `now()`

## Enum database
- `app_role`: `owner`, `member`
- `competition_mode`: `online`, `offline`
- `competition_status`: `planning`, `active`, `submitted`, `completed`, `cancelled`
- `event_type`: `meeting`, `presentation`, `other`
- `fee_type`: `free`, `paid`
- `notification_type`: `mention`, `assignment`, `comment`, `deadline`
- `progress_mode`: `auto`, `manual`
- `task_status`: `todo`, `in_progress`, `review`, `done`

## Relasi utama
- `profiles.id` → `auth.users.id`
- `user_roles.user_id` → `auth.users.id`
- `competitions.created_by` → `profiles.id`
- `competition_members.competition_id` → `competitions.id`
- `competition_members.user_id` → `profiles.id`
- `tasks.competition_id` → `competitions.id`
- `tasks.assignee_id`, `tasks.created_by` → `profiles.id`
- `task_comments.task_id` → `tasks.id`
- `task_comments.author_id` → `profiles.id`
- `task_attachments.task_id` → `tasks.id`
- `task_attachments.uploaded_by` → `profiles.id`
- `calendar_events.competition_id` → `competitions.id`
- `calendar_events.created_by` → `profiles.id`
- `activity_logs.competition_id` → `competitions.id`
- `activity_logs.task_id` → `tasks.id`
- `activity_logs.actor_id` → `profiles.id`
- `notifications.user_id`, `actor_id` → `profiles.id`
- `notifications.competition_id` → `competitions.id`
- `notifications.task_id` → `tasks.id`
- `push_subscriptions.user_id` → `profiles.id`

## RLS: kebijakan yang terdeteksi
Semua tabel `public` yang terdaftar mengaktifkan RLS. Kebijakan yang terdeteksi saat pemeriksaan:

- `profiles`: pengguna aktif dapat membaca profil; pengguna dapat memperbarui profil sendiri.
- `user_roles`: pengguna aktif dapat membaca role (atau role miliknya sendiri).
- `competitions`: pengguna aktif dapat membaca kompetisi; Owner dapat membuat, mengubah, dan menghapus.
- `competition_members`: pengguna aktif dapat membaca daftar anggota; Owner dapat menambah dan menghapus anggota.
- `tasks`: pengguna aktif dapat membaca tugas; pengguna workspace dapat membuat, mengubah, dan menghapus tugas sesuai fungsi akses kompetisi.
- `task_comments`: pengguna aktif dapat membaca komentar; pengguna workspace dapat membuat komentar; penulis dapat mengubah komentar; penulis atau Owner dapat menghapus sesuai kebijakan.
- `task_attachments`: pengguna aktif dapat membaca metadata lampiran; pengguna workspace dapat menambah dan menghapus sesuai akses tugas.
- `calendar_events`: pengguna aktif dapat membaca event; aturan insert/update/delete membatasi berdasarkan Owner atau akses kompetisi.
- `activity_logs`: pengguna aktif dapat membaca aktivitas.
- `notifications`: pengguna hanya dapat membaca, memperbarui, dan menghapus notifikasinya sendiri.
- `push_subscriptions`: pengguna hanya dapat mengelola subscription miliknya sendiri dan harus aktif.

### Catatan keamanan penting
Beberapa kebijakan `SELECT` pada `competitions`, `competition_members`, `tasks`, `task_comments`, `task_attachments`, `calendar_events`, dan `activity_logs` menggunakan pemeriksaan `is_active_user(auth.uid())`. Ini tampak lebih luas daripada aturan produk TEMAN bahwa Member hanya boleh mengakses kompetisi tempat ia terdaftar. Sebelum produksi, tinjau dan perketat kebijakan `SELECT` tersebut agar menggunakan `is_owner(...)` atau `can_access_competition(...)` / `can_access_task(...)` sesuai tabel. Jangan menganggap penyembunyian UI sebagai pengganti RLS.

## Fungsi database yang terdeteksi
- `can_access_attachment_path(_name, _user_id)` → boolean
- `can_access_competition(_competition_id, _user_id)` → boolean
- `can_access_task(_task_id, _user_id)` → boolean
- `generate_deadline_notifications()` → integer
- `get_competition_stats()` → daftar statistik per kompetisi: total tugas, tugas selesai, tugas terlambat, progress
- `has_role(_role, _user_id)` → boolean
- `is_active_user(_user_id)` → boolean
- `is_competition_member(_competition_id, _user_id)` → boolean
- `is_owner(_user_id)` → boolean

## Catatan implementasi untuk Google AI Studio
1. Gunakan tabel, kolom, relasi, enum, dan fungsi di dokumen ini sebagai sumber kebenaran awal.
2. Jangan membuat tabel duplikat atau mengganti skema tanpa meminta persetujuan.
3. Gunakan Supabase Auth untuk sesi autentikasi; `profiles` adalah profil aplikasi, bukan penyimpan password.
4. Jangan pernah menaruh `service_role` key atau password database di frontend.
5. Implementasikan otorisasi di RLS dan server-side function, bukan hanya conditional rendering di React.
6. Periksa kebijakan RLS sebelum menganggap data antar-kompetisi aman.
7. `task_attachments` menyimpan metadata/path; file sebenarnya perlu dikelola melalui Supabase Storage dengan bucket dan aturan akses yang sesuai.
8. Dokumentasi ini bukan SQL dump dan bukan pengganti migration. Untuk perubahan skema, buat migration SQL terpisah dan review sebelum menjalankannya.
9. Data tabel kosong pada saat inspeksi; jangan menganggap ada data contoh atau seed.
10. Struktur database bisa berubah setelah tanggal pemeriksaan; sinkronkan ulang tipe dan dokumentasi setelah migration.

