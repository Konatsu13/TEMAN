# Build TEMAN — Team Management

Bangun aplikasi **TEMAN (Team Management)**, sebuah collaborative workspace untuk mengelola berbagai kompetisi, tim, tugas, dan progress dalam satu tempat.

Produk ini terinspirasi dari pengalaman penggunaan Linear, tetapi harus lebih sederhana, intuitif, dan mudah digunakan.

# 1. Technology Stack

Gunakan:
- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase (`@supabase/supabase-js`)
- React Router untuk routing
- Lucide React untuk icons
- Vite PWA Plugin untuk PWA

Gunakan Supabase sebagai satu-satunya backend utama. Tidak perlu membuat backend Express atau layanan API pihak ketiga.

### Integrasi Supabase

Saya akan memberikan file atau isi `schema.sql` dari Supabase yang sudah saya miliki.

Ketentuannya:
1. Pelajari SQL tersebut sebelum membuat integrasi database.
2. Jadikan schema yang diberikan sebagai referensi utama struktur database.
3. Jangan membuat tabel duplikat jika sudah tersedia.
4. Jangan menghapus atau mengubah struktur dan data yang sudah ada tanpa persetujuan.
5. Jika ada kekurangan, jelaskan dan buat SQL migration tambahan yang bisa saya tinjau dan jalankan sendiri melalui Supabase SQL Editor.
6. Jangan mengklaim sudah menerapkan perubahan database karena kamu tidak memiliki akses langsung ke Supabase saya.

Siapkan koneksi Supabase melalui environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (atau anon key jika project masih menggunakannya).

Buat konfigurasi terpusat di `src/lib/supabase.ts`.

Jangan pernah menaruh service-role key, password, atau secret key di frontend maupun repository.

# 2. Product Design

### Identitas

- Nama: TEMAN
- Kepanjangan: Team Management
- Warna utama: Blue dan Slate
- Tema: Light dan Dark
- Bahasa UI: Indonesia
- Format waktu: WIB

Buat desain modern dengan pendekatan productivity SaaS:
- Bersih dan profesional.
- Whitespace yang cukup.
- Hierarki informasi jelas.
- Komponen konsisten.
- Minim dekorasi yang tidak diperlukan.
- Hindari tampilan dashboard generik hasil AI.

### Layout

Desktop:
- Sidebar navigation.
- Main content.
- Header dengan pencarian, notifikasi, theme switcher, dan profil.

Mobile:
- Bottom navigation.
- Layout berbasis cards.
- Task detail menggunakan full-screen panel.
- Form disesuaikan dengan ukuran layar.

### Navigasi

- Overview
- Competitions
- My Tasks
- Calendar
- Members
- Notifications
- Settings

Buat splash screen singkat berisi logo TEMAN sebelum login. Gunakan skeleton loading untuk halaman yang sedang mengambil data.

# 3. Authentication dan Authorization

Ada dua role:

**Owner**
- Melihat dan mengelola seluruh kompetisi.
- Membuat, mengedit, dan menghapus kompetisi.
- Membuat dan mengelola akun Member.
- Mengatur anggota setiap kompetisi.
- Mengubah progress kompetisi secara manual.
- Mengakses seluruh task dan statistik.

**Member**
- Dapat melihat daftar seluruh kompetisi.
- Hanya dapat mengakses workspace dan mengelola task pada kompetisi tempat ia menjadi anggota.
- Dapat membuat, mengedit, dan menghapus task.
- Dapat mengubah status task.
- Dapat berkomentar, melakukan mention, dan mengunggah attachment.

Tidak ada:
- Public registration.
- Google Login.
- Accountless member.

Gunakan username dan password pada halaman login.

Supabase Auth tetap menjadi sistem autentikasi. Karena Supabase Auth menggunakan email atau nomor telepon sebagai identifier, rancang mekanisme username login yang aman menggunakan pemetaan username di sisi server jika diperlukan.

Owner dapat membuat akun Member tanpa mengganti atau mengakhiri sesi Owner yang sedang aktif. Gunakan mekanisme server-side yang aman untuk pembuatan akun apabila membutuhkan hak administratif Supabase.

Jangan menyimpan password plaintext.

**PENTING:** Semua pembatasan akses wajib diterapkan di Supabase RLS, bukan hanya melalui kondisi tampilan frontend.

Siapkan prosedur pembuatan akun Owner pertama secara aman.

# 4. Database

Gunakan tabel berikut sebagai target struktur database. Sesuaikan dengan SQL yang saya berikan dan jangan membuat duplikasi.

- `profiles`
- `competitions`
- `competition_members`
- `tasks`
- `task_comments`
- `task_attachments`
- `calendar_events`
- `activity_logs`
- `notifications`
- `push_subscriptions`

Ketentuan:
- Gunakan UUID sebagai primary key.
- Gunakan foreign key dan timestamps.
- Terapkan unique constraints dan index seperlunya.
- Gunakan RLS untuk seluruh data yang perlu dilindungi.
- File disimpan pada private Supabase Storage bucket.
- Database menyimpan metadata dan storage path file.
- Tidak perlu tabel khusus untuk statistik.
- Tidak perlu tabel kalender tambahan untuk deadline yang sudah berasal dari kompetisi atau task.
- Satu akun dapat bergabung ke banyak kompetisi.
- Setiap kompetisi memiliki tim dan daftar anggotanya sendiri.

# 5. Main Features

## A. Dashboard / Overview

Tampilkan:
- Total kompetisi.
- Kompetisi aktif dan selesai.
- Total task.
- Task selesai dan terlambat.
- Total biaya pendaftaran.
- Upcoming deadlines.
- Ringkasan progress kompetisi.
- Recent activity.
- My Tasks berdasarkan task yang ditugaskan kepada pengguna.

Owner melihat ringkasan global. Member melihat kompetisi yang tersedia dan task yang relevan dengan dirinya.

## B. Competition Management

CRUD kompetisi hanya oleh Owner.

Setiap kompetisi memiliki informasi:
- Nama kompetisi.
- Penyelenggara.
- Mode Online / Offline.
- Tujuan kompetisi.
- Tujuan tim.
- Nama tim.
- Anggota.
- Deadline.
- Biaya pendaftaran: Free / Paid.
- Instagram URL.
- Guidebook URL.
- GitHub URL.
- Figma URL.
- Resource URL tambahan.

Status kompetisi:
- Planning
- Active
- Submitted
- Completed
- Cancelled

Owner dapat menyalin daftar anggota dari kompetisi sebelumnya tanpa membuat akun duplikat.

Workspace kompetisi memiliki tab:
- Overview
- Board
- List
- Calendar
- Activity

## C. Task Management

Tersedia dua tampilan menggunakan sumber data yang sama:

1. Board / Kanban.
2. List.

Status task:
- To Do
- In Progress
- Review
- Done

Informasi task:
- Judul.
- Deskripsi.
- Kompetisi.
- Satu assignee (opsional).
- Deadline (opsional).
- Creator.
- Created at.
- Updated at.

Fitur:
- Create, edit, delete task.
- Drag and drop pada Board.
- Search.
- Filter status dan assignee.
- Sorting.
- Task detail.
- Komentar.
- Mention.
- File attachment.

Tidak menggunakan priority maupun time tracking.

Task dapat dikelola oleh Owner dan anggota kompetisi terkait.

## D. Collaboration

- Komentar pada task.
- Mention dengan format `@username`.
- Autocomplete anggota kompetisi.
- Notifikasi untuk pengguna yang di-mention.
- Attachment menggunakan Supabase Storage.
- Activity log sederhana untuk aktivitas penting.

Jangan membangun sistem chat terpisah.

## E. Calendar

Tampilan:
- Month
- Week
- Agenda

Sumber kalender:
- Deadline kompetisi.
- Deadline task.
- Event internal seperti rapat, diskusi, dan presentasi.

Sediakan filter berdasarkan kompetisi dan jenis event.

Deadline kompetisi dan task harus diambil langsung dari tabel asalnya agar tidak terjadi duplikasi data.

## F. Progress dan Statistics

Progress otomatis:

`jumlah task Done / total task × 100%`

Jika belum ada task, progress adalah 0%.

Owner dapat mengganti mode:
- Automatic
- Manual

Dalam mode Manual, Owner dapat menentukan progress 0–100%.

Sediakan tombol untuk kembali ke Automatic.

Jangan mengubah progress otomatis menjadi manual tanpa tindakan eksplisit Owner.

Statistik harus berasal dari database aktual.

## G. Notifications

Sediakan:
- In-app notification.
- Unread/read state.
- Mark as read.
- Mark all as read.

Jenis notifikasi:
- Mention.
- Task assignment.
- Komentar.
- Task deadline.
- Competition deadline.
- Calendar reminder.

Web Push dapat diimplementasikan setelah notifikasi in-app berjalan dengan baik. Gunakan mekanisme server-side untuk pengiriman push notification dan jangan mengekspos secret key.

# 6. PWA

Buat TEMAN dapat di-install sebagai Progressive Web App.

Implementasikan:
- Web App Manifest.
- App icons.
- Service worker.
- Standalone display.
- Install prompt.
- Offline fallback sederhana.

Pastikan aplikasi tetap dapat digunakan dengan baik saat koneksi kembali tersedia dan tidak menampilkan data lama secara keliru.

# 7. Folder Structure

Gunakan struktur sederhana dan terorganisasi. Contoh:

```text
src/
├── components/
│   ├── layout/
│   ├── ui/
│   └── shared/
├── pages/
│   ├── auth/
│   ├── dashboard/
│   ├── competitions/
│   ├── tasks/
│   ├── calendar/
│   └── members/
├── hooks/
├── lib/
│   └── supabase.ts
├── services/
├── types/
├── utils/
├── App.tsx
└── main.tsx

public/
supabase/
```

Jangan membuat terlalu banyak folder atau abstraksi yang belum dibutuhkan.

# 8. Development Workflow

Bangun aplikasi secara bertahap.

**Phase 1 — Foundation**
- Pelajari schema.sql.
- Periksa kesesuaian tabel dan relasi.
- Identifikasi kebutuhan migration dan RLS.
- Siapkan React, TypeScript, Vite, dan Tailwind.
- Siapkan routing dan Supabase Client.
- Buat design system dan application shell.
- Buat splash screen dan halaman login.

**Phase 2 — Core Management**
- Authentication.
- Role Owner dan Member.
- Dashboard.
- Competition CRUD.
- Account management.
- Competition membership.

**Phase 3 — Task dan Collaboration**
- Board dan List.
- Task detail.
- Comments.
- Mentions.
- Attachments.
- Activity log.

**Phase 4 — Calendar dan Progress**
- Calendar.
- Automatic dan manual progress.
- Statistics.

**Phase 5 — Finishing**
- In-app notifications.
- Web Push.
- PWA.
- Responsive optimization.
- Testing dan bug fixing.

# 9. Important Development Rules

- Kerjakan satu phase pada satu waktu.
- Jangan otomatis melanjutkan phase berikutnya.
- Pertahankan kode yang sudah berfungsi.
- Jangan melakukan refactor besar tanpa alasan.
- Jangan menambah fitur di luar spesifikasi.
- Jangan menggunakan mock data untuk menggantikan integrasi database.
- Jangan membuat tombol yang tidak berfungsi.
- Jangan mengasumsikan tabel atau kolom yang belum tersedia.
- Tangani loading, empty state, dan error state.
- Periksa akses Owner dan Member.
- Pastikan RLS benar-benar membatasi akses data.
- Utamakan implementasi sederhana daripada arsitektur kompleks.

Setelah setiap phase, laporkan:
1. Fitur yang berhasil dibuat.
2. File yang dibuat atau diubah.
3. Perubahan database atau migration yang diperlukan.
4. Pengujian yang sudah dilakukan.
5. Bug atau pekerjaan yang belum selesai.

## TUGAS PERTAMA

Mulai dengan **Phase 1 — Foundation**.

Saya akan memberikan `schema.sql` secara terpisah. Analisis file tersebut terlebih dahulu sebelum membuat asumsi tentang database.

Jangan melanjutkan ke Phase 2 sebelum fondasi dan koneksi Supabase siap diperiksa.