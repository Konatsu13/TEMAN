# TEMAN — Design System & UI/UX Specification
> **Single Source of Truth (SSOT) untuk Redesign Antarmuka TEMAN (Team Management)**  
> **Versi:** 2.0.0 · **Status:** Review Ready · **Zona Waktu:** Asia/Jakarta (WIB / UTC+7) · **Bahasa Antarmuka:** Bahasa Indonesia

---

## 1. Visual Thesis & Filosofi Desain

### 1.1 Visual Thesis
- **Kepribadian Produk:** Berfokus, terstruktur, disiplin, dan kolaboratif. Dirancang khusus untuk tim mahasiswa dan talenta muda yang berkompetisi di ajang teknologi, sains, dan desain (seperti GEMASTIK, hackathon, lomba UI/UX, dan kompetisi inovasi).
- **Atmosfer yang Dituju:** *Calm, Focused, and Editorial Precision*. Antarmuka terasa seperti *workbench* produktivitas profesional kelas atas (kombinasi ketegasan Linear dan kejelasan editorial), bukan template dashboard admin generik dengan grafik-grafik hiasan tanpa makna.
- **Kepadatan Informasi (Density):** *Balanced-to-Dense*. Data kompetisi, status tugas, tenggat waktu WIB, dan penugasan anggota disajikan dengan keterbacaan tinggi tanpa ruang kosong berlebihan (*no bloated white space*).
- **Ritme Visual:** Grid modular terstruktur dengan baseline horizontal konsisten. Hirarki dibentuk melalui kontras tipografi, bobot, dan spasi proporsional—bukan dengan membungkus setiap elemen ke dalam kartu terpisah (*avoid nested card hell*).
- **Intensitas Gerakan:** *Restrained & Purposeful* (150–250ms). Transisi mikro hanya digunakan untuk mengonfirmasi aksi, memandu fokus, dan merefleksikan perubahan status data. Tidak ada animasi terus-menerus (*zero perpetual loops*).

### 1.2 Prinsip Inti Desain
1. **Kejelasan di Atas Ornamen:** Pengguna yang sedang menghadapi *deadline* kompetisi butuh segera tahu apa yang harus dikerjakan hari ini, siapa penanggung jawabnya, dan berapa waktu tersisa.
2. **Konteks Waktu Tunggal (WIB):** Seluruh tenggat tugas, jadwal rapat, dan batas akhir kompetisi ditampilkan secara eksplisit dalam format WIB (UTC+7) menggunakan angka tabular (*tabular nums*).
3. **Pembedaan Hak Akses yang Halus namun Tegas:** Owner memiliki kendali tata kelola (kelola anggota, buat kompetisi, konfigurasi), sedangkan Member berfokus pada eksekusi tugas dan update progres. UI harus merefleksikan otorisasi ini tanpa layout yang pecah.
4. **Anti-Generic AI Aesthetic:** Tidak menggunakan gradient ungu-biru neon, efek glassmorphism berlebihan, glow blur, atau card identik 3 kolom yang dipaksakan.

---

## 2. Design Tokens & Color System

Sistem warna TEMAN menggunakan pondasi netral **Slate** dingin (*cool slate neutral*) dipadukan dengan aksen primer **Cobalt Blue** yang tegas dan terkalibrasi untuk kontras WCAG 2.1 AA di kedua mode (Light & Dark).

### 2.1 Semantic Color Tokens

| Token | Light Mode (CSS / Hex) | Dark Mode (CSS / Hex) | Peran & Penggunaan |
|---|---|---|---|
| `--bg-canvas` | `#F8FAFC` (slate-50) | `#090D16` (deep slate-950) | Latar belakang kanvas aplikasi |
| `--bg-surface` | `#FFFFFF` (white) | `#0F172A` (slate-900) | Surface utama: Sidebar, Header, Modal, Cards |
| `--bg-surface-elevated` | `#F1F5F9` (slate-100) | `#1E293B` (slate-800) | Sub-surface: Input, header tabel, badge neutral |
| `--bg-surface-hover` | `#E2E8F0` (slate-200) | `#334155` (slate-700) | State hover pada baris tabel & list item |
| `--border-subtle` | `#E2E8F0` (slate-200) | `#1E293B` (slate-800) | Pemisah seksi, divider, border kartu |
| `--border-strong` | `#CBD5E1` (slate-300) | `#334155` (slate-700) | Border input default, border modal |
| `--border-focus` | `#2563EB` (blue-600) | `#60A5FA` (blue-400) | Ring fokus interaktif dan input aktif |
| `--text-primary` | `#0F172A` (slate-900) | `#F8FAFC` (slate-50) | Teks judul, teks utama, angka penting |
| `--text-secondary` | `#475569` (slate-600) | `#94A3B8` (slate-400) | Label form, deskripsi seksi, teks pendukung |
| `--text-muted` | `#94A3B8` (slate-400) | `#64748B` (slate-500) | Placeholder, timestamp sekunder, shortcut kbd |
| `--primary` | `#2563EB` (blue-600) | `#3B82F6` (blue-500) | Brand accent, tombol utama, tab aktif |
| `--primary-hover` | `#1D4ED8` (blue-700) | `#2563EB` (blue-600) | State hover tombol primer |
| `--primary-subtle` | `rgba(37, 99, 235, 0.08)` | `rgba(59, 130, 246, 0.15)` | Background pill aktif, seleksi baris |
| `--entity-name` | `#315A86` | `#8FB4DD` | Nama kompetisi, tugas, event, tim; bukan tautan visual |

### 2.2 Semantic Status Colors

| Status | Text & Icon | Background Subtle | Border Subtle | Penggunaan dalam TEMAN |
|---|---|---|---|---|
| **Success** | `#16A34A` (green-600) / `#4ADE80` (green-400) | `#F0FDF4` / `rgba(34,197,94,0.12)` | `#BBF7D0` / `rgba(34,197,94,0.3)` | Status: Done, Completed, Free fee |
| **Warning** | `#D97706` (amber-600) / `#FBBF24` (amber-400) | `#FFFBEB` / `rgba(245,158,11,0.12)` | `#FDE68A` / `rgba(245,158,11,0.3)` | Status: Review, Deadline < 48 jam, Paid fee |
| **Danger** | `#DC2626` (red-600) / `#F87171` (red-400) | `#FEF2F2` / `rgba(239,68,68,0.12)` | `#FECACA` / `rgba(239,68,68,0.3)` | Overdue task, hapus data, error autentikasi |
| **Info / Active** | `#0284C7` (sky-600) / `#38BDF8` (sky-400) | `#F0F9FF` / `rgba(14,165,233,0.12)` | `#BAE6FD` / `rgba(14,165,233,0.3)` | Status: In Progress, Active, Online mode |
| **Neutral / Plan** | `#64748B` (slate-500) / `#94A3B8` (slate-400) | `#F8FAFC` / `rgba(148,163,184,0.12)` | `#E2E8F0` / `rgba(148,163,184,0.3)` | Status: To Do, Planning, Offline mode |

---

## 3. Typography System

Menggunakan keluarga font yang telah teruji keterbacaannya dan sudah terpasang di `index.html`:
1. **Display & Headings:** `Plus Jakarta Sans` (Geometrik, bersih, berkarakter tegas).
2. **Body & Interface:** `DM Sans` (Humanis, sangat nyaman dibaca pada ukuran 12–15px).
3. **Numerals & Metadata:** `JetBrains Mono` (Proporsi monospace untuk angka tanggal WIB, persentase progres, dan kode referensi).

### 3.1 Skala Tipografi

| Nama Peran | Ukuran (px/rem) | Weight | Line Height | Tracking | Penggunaan |
|---|---|---|---|---|---|
| **Display Title** | 28px / 1.75rem | Bold (700) | 1.2 | -0.02em | Hero headline halaman login & ringkasan besar |
| **Page Title** | 22px / 1.375rem | Bold (700) | 1.25 | -0.015em | Judul utama halaman di App Header & konten |
| **Section Title** | 16px / 1.0rem | Semibold (600) | 1.35 | -0.01em | Judul kartu, sub-seksi dashboard, kolom kanban |
| **Body Default** | 14px / 0.875rem | Regular (400) | 1.5 | normal | Teks deskripsi, teks formulir, baris tabel |
| **Body Medium** | 14px / 0.875rem | Medium (500) | 1.5 | normal | Label tombol, judul list, nama anggota tim |
| **Caption / Label** | 12px / 0.75rem | Medium (500) | 1.4 | +0.01em | Label form input, badge teks, tab navigation |
| **Timestamp / Mono** | 12px / 0.75rem | Regular (400/500) | 1.4 | normal (`tabular-nums`) | Tanggal WIB, persentase, counter angka |

---

## 4. Spacing, Elevation, and Radius Tokens

### 4.1 Spacing Scale (Tailwind 4)
- `2xs`: `4px` (`0.25rem`) — Jarak ikon ke teks inline, gap badge
- `xs`: `8px` (`0.5rem`) — Padding tombol kecil, gap tag list
- `sm`: `12px` (`0.75rem`) — Padding vertikal input, gap list item
- `md`: `16px` (`1.0rem`) — Padding internal kartu kecil, gap kolom
- `lg`: `20px` (`1.25rem`) — Padding kartu standar, spacing antar seksi form
- `xl`: `24px` (`1.5rem`) — Padding container halaman mobile/desktop
- `2xl`: `32px` (`2.0rem`) — Jarak antar section besar halaman

### 4.2 Border Radius
- `Button & Input`: `8px` (`rounded-lg`) — Presisi, modern, tidak over-rounded
- `Cards & Modals`: `12px` (`rounded-xl`) — Struktur kontainer stabil
- `Pill / Badge`: `6px` (`rounded-md`) — Hindari rounded-full melingkar besar kecuali avatar
- `Avatar`: `8px` (`rounded-lg`) atau `9999px` (`rounded-full`)

### 4.3 Elevation & Shadows
- **Base (Flat):** `border border-slate-200 dark:border-slate-800` tanpa bayangan dekoratif.
- **Card Default:** `shadow-xs border border-slate-200/80 dark:border-slate-800/80 dark:shadow-none`.
- **Dropdown & Flyout:** `shadow-lg border border-slate-200 dark:border-slate-800`.
- **Modal Dialog:** `shadow-2xl border border-slate-300/80 dark:border-slate-700/80`.

---

## 5. Shell & Navigation Architecture

### 5.1 Desktop Layout (`>= 1024px`)
- **Fixed Left Sidebar (256px / `w-64`):**
  - Brand header dengan logo TEMAN dan wordmark resmi.
  - Seksi 1: **Workspace** (`Overview`, `Competitions`, `My Tasks`, `Calendar`).
  - Seksi 2: **Tim & Tata Kelola** (`Members`, `Notifications`, `Settings`).
  - Footer pengguna: Avatar inisial, nama lengkap, role badge (`Owner` / `Member`), dan shortcut logout.
- **Top Sticky Header (`h-14` / `h-16`):**
  - Indikator konteks halaman aktif (dengan slot breadcrumb bila di dalam detail kompetisi).
  - Quick Search input (`⌘K` / `Ctrl+K`) dengan popover jump-to menu.
  - Theme Toggle (Light / Dark switch instan).
  - Avatar menu profil ringkas.
- **Main Scroll Area:**
  - `max-w-7xl` mx-auto dengan padding horizontal terstandarisasi (`px-6 py-6 lg:px-8 lg:py-8`).

### 5.2 Mobile & Tablet Layout (`< 1024px`)
- **Top Mobile Bar (`h-14`):** Brand logo + nama halaman + Theme toggle + avatar.
- **Bottom Navigation Bar (`h-16`):**
  - 4 Menu Utama: `Overview`, `Kompetisi`, `Tugas`, `Kalender`.
  - 1 Action Sheet Trigger: `Lainnya` (Membuka drawer bottom-sheet berisi `Anggota`, `Notifikasi`, `Pengaturan`, dan `Keluar`).
  - Memperhitungkan iOS safe area (`pb-[env(safe-area-inset-bottom)]`).
  - Minimum touch target: `44px × 44px`.

---

## 6. Core Component System Specifications

### 6.1 Buttons
- **Primary:** Background `--primary`, teks putih, border transparan. Digunakan untuk aksi utama per seksi (maksimal 1 per viewport).
- **Secondary:** Background `--bg-surface`, border `--border-strong`, teks `--text-primary`. Digunakan untuk aksi batal atau pendukung.
- **Ghost:** Background transparan, teks `--text-secondary`, hover `--bg-surface-elevated`. Digunakan untuk icon button dan navigasi sekunder.
- **Danger:** Background `--danger`, teks putih. Khusus untuk operasi destruktif (misal: Hapus Kompetisi, Keluarkan Anggota) dengan konfirmasi.
- **States Wajib:** Default, Hover, Focus-Visible (ring offset 2px), Active, Disabled (`opacity-50 cursor-not-allowed`), Loading (spinner inline tanpa pergeseran teks).
- Tombol AI global memakai ikon sparkle pada gradien biru-ke-ungu sesuai aset referensi; gradien ini dibatasi pada tombol tersebut dan tidak digunakan untuk elemen dekoratif lain.

### 6.1.1 Entity Names
- Gunakan token `--entity-name` melalui kelas `.entity-name` untuk nama kompetisi, tim, tugas, dan event.
- Nama tetap tanpa underline atau efek hover menyerupai tautan; jika nama memang dapat diklik, pertahankan interaksi dan fokus keyboard aslinya.

### 6.2 Forms & Inputs
- **Label:** Selalu persisten di atas input (`text-xs font-medium text-slate-700 dark:text-slate-300`).
- **Placeholder:** Memberikan format atau petunjuk nyata, bukan label berulang.
- **Feedback Validasi:** Pesan error muncul tepat di bawah input (`text-xs text-red-600 dark:text-red-400`) dengan ikon indikator dan aria-describedby.
- **Focus State:** Border beralih ke `--primary` dengan subtle outer glow ring (`ring-2 ring-blue-500/20`).

### 6.3 Badges & Status Tags
- Desain *soft pill* persegi tumpul (`px-2 py-0.5 text-xs font-medium rounded-md`).
- Warna teks solid dengan background subtle 10% opacity dan border 20% opacity.
- Format teks baku:
  - Kompetisi: `Planning`, `Active`, `Submitted`, `Completed`, `Cancelled`.
  - Mode: `Online`, `Offline`.
  - Biaya: `Gratis`, `Berbayar (Rp xxx)`.
  - Tugas: `To Do`, `In Progress`, `Review`, `Done`.

### 6.4 Cards & Modular Containers
- Dilarang membungkus setiap elemen teks ke dalam kartu.
- Kartu hanya digunakan untuk entitas bermakna: Satu kartu per Kompetisi di grid/list, satu kartu per Task di kanban, atau container form pengaturan.
- Struktur kartu: `Header` (judul + status badge), `Body` (deskripsi/metadata), `Footer` (assignee, deadline WIB, action trigger).

### 6.5 Skeletons & Empty States
- **Skeleton:** Merefleksikan struktur aktual konten (header skeleton, 3 baris list skeleton, kanban column skeleton) tanpa generic full-page spinner.
- **Empty State:** Menyajikan 3 elemen wajib:
  1. Ikon representatif monokromatik terfokus.
  2. Judul ramah & deskripsi alasan mengapa belum ada data.
  3. Tombol aksi jelas (CTA) jika pengguna memiliki izin (misal: *"Tambah Kompetisi Pertama"* bagi Owner).

---

## 7. Spesifikasi Halaman & Alur Pengguna (User Flows)

### 7.1 Login Page (`/login`)
- **Tujuan:** Akses aman akun tim tanpa pendaftaran publik (akun dibuat oleh Owner).
- **Arsitektur Visual:**
  - Desktop (`lg:grid-cols-12`): 7 kolom kiri berisi *Architectural Workspace Showcase* interaktif (menampilkan pratinjau nyata Alur Tugas, Detail Kompetisi, dan Kalender WIB), 5 kolom kanan berisi formulir login yang bersih dan terfokus.
  - Mobile: Fokus langsung ke form login dengan logo TEMAN di atas dan footer status koneksi Supabase di bawah.
- **Formulir:** Input Username (bukan email publik) + Password (dengan toggle visibility) + Tombol Submit + Banner error terisolasi.

### 7.2 Dashboard Overview (`/overview`)
- **Tujuan:** *Cockpit* harian pengguna saat membuka aplikasi.
- **Komposisi Layout:**
  1. **Greeting Bar:** Salam personal berdasarkan nama pengguna, role badge, dan indikator waktu WIB real-time.
  2. **Statistik Terfokus (4 Metrik Utama):**
     - Kompetisi Aktif (Active Competitions).
     - Tugas Saya Belum Selesai (My Pending Tasks).
     - Tugas Dalam Review (Review Tasks).
     - Deadline Mendekat (< 3 Hari).
  3. **Split Grid:**
     - Kiri (2/3 lebar): Daftar Tugas Prioritas Hari Ini & Kompetisi Aktif dengan progress bar otomatis/manual.
     - Kanan (1/3 lebar): Agenda & Deadline Terdekat (WIB) + Catatan Aktivitas Terbaru (*activity log feed*).

### 7.3 Competitions Module (`/competitions`)
- **Tujuan:** Mengelola seluruh kompetisi tim secara terstruktur.
- **Fitur & Tampilan:**
  - Header dengan filter status (`Semua`, `Active`, `Planning`, `Submitted`, `Completed`) dan tombol *"Tambah Kompetisi"* (khusus Owner).
  - Tampilan toggle: **Grid View** (kartu informatif) & **Table View** (pemindaian data cepat).
  - Elemen kartu kompetisi: Nama kompetisi, penyelenggara, mode (Online/Offline), deadline WIB, progress bar kalkulasi otomatis (jumlah task selesai / total task), dan direct links (Guidebook, Figma, GitHub).

### 7.4 My Tasks Module (`/tasks`)
- **Tujuan:** Tempat anggota mengeksekusi dan memantau tugas-tugas yang menjadi tanggung jawabnya.
- **Fitur & Tampilan:**
  - Filter: Menurut kompetisi, prioritas deadline, dan status.
  - Dua mode tampilan: **Kanban Board** (kolom: *To Do*, *In Progress*, *Review*, *Done*) dan **List View** (tabel ringkas terurut deadline).
  - Kartu Task: Judul tugas, tag kompetisi, due date WIB (highlight merah jika lewat waktu), indikator jumlah komentar, dan avatar penanggung jawab.

### 7.5 Calendar Module (`/calendar`)
- **Tujuan:** Pandangan temporal menyeluruh atas seluruh kegiatan tim.
- **Fitur & Tampilan:**
  - Header dengan tombol navigasi bulan/minggu dan toggle tampilan: **Month View**, **Week View**, dan **Agenda View**.
  - Pembedaan visual kategori event menggunakan dot/badge warna:
    - Biru: Jadwal Pertemuan / Sinkronisasi Tim (*Meeting*).
    - Amber: Tenggat Waktu Tugas (*Task Due Date*).
    - Merah: Batas Akhir Pengumpulan Kompetisi (*Competition Deadline*).
    - Hijau: Jadwal Presentasi / Penjurian (*Presentation*).

### 7.6 Members Module (`/members`)
- **Tujuan:** Tata kelola akun tim oleh Owner dan direktori anggota untuk Member.
- **Fitur & Tampilan:**
  - Owner Action: Tombol *"Tambah Anggota Baru"* (memunculkan modal input: Username, Nama Lengkap, Role, dan Password Awal tanpa memutus sesi aktif).
  - Tabel Direktori: Nama lengkap, username, peran (`Owner` / `Member`), status aktif, tanggal bergabung (WIB), dan aksi edit/nonaktifkan bagi Owner.

### 7.7 Notifications Module (`/notifications`)
- **Tujuan:** Pusat pemberitahuan aktivitas tim.
- **Fitur & Tampilan:**
  - Pengelompokan: *Belum Dibaca (Unread)* dan *Semua (All)*.
  - Tipe notifikasi dengan ikon semantik:
    - Mention (`@username` di komentar).
    - Assignment (ditugaskan pada task baru).
    - Comment (diskusi pada task yang diikuti).
    - Deadline (peringatan tenggat < 24 jam).
  - Aksi: Tandai semua telah dibaca (*Mark all as read*).

### 7.8 Settings Module (`/settings`)
- **Tujuan:** Personalisasi pengguna dan informasi akun.
- **Fitur & Tampilan:**
  - Profil Pengguna (Nama lengkap, username, role, tanggal pembuatan akun).
  - Preferensi Tema (Sistem, Terang, Gelap) dengan visual preview kartu.
  - Sesi Akun & Logout dengan konfirmasi.

---

## 8. State Matrix & Edge Cases

| State | Komponen Form | Komponen Tabel/List | Komponen Kanban |
|---|---|---|---|
| **Empty State** | N/A | Ilustrasi monokromatik + keterangan spesifik + tombol tambah | Kolom menampilkan area *drop-target* dashed kosong dengan pesan ramah |
| **Loading State** | Input disabled + button spinner | Skeleton rows (3–5 baris shimmer) | Shimmer cards di dalam masing-masing kolom |
| **Error State** | Border merah + pesan error di bawah input | Banner peringatan atas + tombol "Coba Lagi" | Banner error di atas board tanpa memecahkan layout |
| **Partial Data** | Nilai yang belum diisi menampilkan tanda `—` | Kolom opsional (misal: figma_url) menampilkan ikon disabled | Tag yang tidak ada deadline tidak menampilkan badge waktu |
| **Offline/Unconfigured** | Banner informatif koneksi Supabase | N/A (memandu melengkapi variabel `.env`) | N/A |

---

## 9. Standar Aksesibilitas & Responsivitas (A11y)

1. **Kontras Warna:** Seluruh pasangan warna teks dan background memenuhi rasio kontras minimum 4.5:1 untuk teks normal dan 3:1 untuk teks besar (WCAG AA).
2. **Navigasi Keyboard:** Semua elemen interaktif (tombol, input, link, tab) memiliki outline fokus yang terlihat jelas (`focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2`).
3. **Screen Readers:** Ikon aksi tanpa teks wajib menyertakan atribut `aria-label` yang deskriptif dalam Bahasa Indonesia.
4. **Touch Target Size:** Pada tampilan mobile, area sentuh tombol dan navigasi minimal `44px × 44px`.
5. **Reduced Motion:** Seluruh transisi dan animasi CSS menghormati media query `@media (prefers-reduced-motion: reduce)`.

---

## 10. Daftar Anti-Pattern (Strict Rules)

- **JANGAN** menggunakan 3-card generic metrics layout dengan icon bulat warna-warni tanpa arti bisnis yang jelas.
- **JANGAN** membuat tombol palsu atau aksi non-fungsional yang tidak terhubung dengan kapabilitas sistem.
- **JANGAN** mengubah skema database Supabase, nama tabel, kolom, RLS policies, atau auth provider hanya demi kebutuhan kosmetik.
- **JANGAN** menggunakan font selain yang telah ditetapkan (`Plus Jakarta Sans`, `DM Sans`, `JetBrains Mono`).
- **JANGAN** menggunakan emoji sebagai pengganti ikon antarmuka (gunakan selalu paket resmi `lucide-react`).
- **JANGAN** menumpuk kartu di dalam kartu (*nested card containers*) tanpa kebutuhan hierarki informasi yang nyata.

---

## 11. Redesign Implementation Plan (Phased Roadmap)

### Fase 1: Fondasi Token & Primitive Components
- **Objektif:** Memperbarui variabel CSS, utility tokens, dan primitive components (`Button`, `Input`, `Badge`, `Card`, `EmptyState`, `Skeleton`).
- **File Terdampak:** `src/index.css`, `src/components/ui/*`.
- **Kriteria Selesai:** Seluruh primitive component lolos audit status (default, hover, focus, disabled, loading) dan tema (Light & Dark).

### Fase 2: Layout Shell & Navigation Polish
- **Objektif:** Menyempurnakan `AppShell`, `Sidebar`, `TopHeader`, dan `MobileBottomNav`.
- **File Terdampak:** `src/components/layout/*`.
- **Kriteria Selesai:** Transisi mobile drawer mulus, search shortcut `⌘K` responsif, responsive breakpoint `1024px` presisi, touch target mobile memenuhi 44px.

### Fase 3: Redesign Halaman Autentikasi (`/login`)
- **Objektif:** Memperbaiki layout dua-kolom showcase pada desktop dan penyempurnaan form responsif mobile.
- **File Terdampak:** `src/pages/auth/LoginPage.tsx`.
- **Kriteria Selesai:** Showcase interaktif berjalan lancar, form validation feedback intuitif, dark mode serasi tanpa kontras bocor.

### Fase 4: Halaman Dashboard Overview & Pengaturan (`/overview`, `/settings`)
- **Objektif:** Mengubah stub Overview menjadi tata letak dashboard yang terstruktur dengan widget nyata (statistik, agenda WIB, task prioritas) dan menyempurnakan Settings.
- **File Terdampak:** `src/pages/dashboard/OverviewPage.tsx`, `src/pages/settings/SettingsPage.tsx`.
- **Kriteria Selesai:** Hierarchy visual jelas, waktu konsisten WIB, aksi tema dan profil akun intuitif.

### Fase 5: Halaman Spesifik Domain (`/competitions`, `/tasks`, `/calendar`, `/members`, `/notifications`)
- **Objektif:** Membangun layout struktural yang siap menerima data Supabase di fase selanjutnya.
- **File Terdampak:** `src/pages/competitions/*`, `src/pages/tasks/*`, `src/pages/calendar/*`, `src/pages/members/*`, `src/pages/notifications/*`.
- **Kriteria Selesai:** Seluruh filter, toggle view (Grid/Table, Kanban/List, Month/Week/Agenda), empty state, dan skeleton loader terpasang rapi.
