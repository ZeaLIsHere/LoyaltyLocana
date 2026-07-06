# Locana - Aplikasi Loyalty Digital berbasis QR Code

Locana adalah aplikasi loyalty digital berbasis QR Code yang dirancang khusus untuk satu outlet cafe. Aplikasi ini memfasilitasi pengumpulan stamp oleh customer, penambahan stamp oleh kasir, dan penukaran reward (hadiah) secara aman dengan pelacakan audit trail yang mutakhir.

## Fitur Utama

- **Customer**: Menampilkan QR Code unik statis, memantau kemajuan stamp, melihat reward tersedia, riwayat kunjungan (timeline), dan pengaturan profil/bahasa.
- **Kasir**: Memindai QR Code customer secara real-time via kamera browser, menambah stamp (dengan proteksi cooldown 5 menit), dan memproses penukaran reward.
- **Owner**: Dashboard performa dengan visualisasi tren 7 hari terakhir, manajemen Kasir (CRUD), manajemen Reward Rules (CRUD), daftar customer, dan audit trail log aktivitas lengkap (scan log).
- **Internationalization (i18n)**: Dukungan multibahasa dinamis (Bahasa Indonesia ⇄ Bahasa Inggris) untuk seluruh halaman role.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Database & Auth**: Supabase (PostgreSQL, Supabase Auth, Row Level Security)
- **Styling**: Tailwind CSS, shadcn/ui
- **QR Code**: `qrcode` (generator), `html5-qrcode` (scanner kamera browser)
- **Grafik Dashboard**: Recharts
- **i18n**: `next-intl`

---

## Panduan Setup Proyek

### 1. Prasyarat & Dependensi
Pastikan Anda memiliki Node.js terinstal, lalu instal seluruh package dalam folder proyek:
```bash
npm install
```

### 2. Konfigurasi Environment Variables
Salin berkas template `.env.local.example` menjadi `.env.local` di root proyek:
```bash
cp .env.local.example .env.local
```
Lengkapi nilai kunci dari dasbor proyek Supabase Anda:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
QR_SIGNING_SECRET=<random-32-byte-hex>
```
*Penting: `SUPABASE_SERVICE_ROLE_KEY` sangat rahasia dan hanya digunakan di server actions untuk mendaftarkan akun kasir (Supabase Admin Auth API).*

*`QR_SIGNING_SECRET` dipakai server untuk menandatangani QR pelanggan yang berumur pendek (berganti tiap 60 detik) sehingga screenshot QR lama ditolak kasir. Hanya dipakai di sisi server (jangan beri prefix `NEXT_PUBLIC_`). Buat nilainya dengan `openssl rand -hex 32`, dan set juga di environment variables Vercel saat deploy.*

### 3. Setup Database Supabase (Migration)
Salin isi berkas migrasi SQL berikut:
- **File Migrasi**: [supabase/migrations/20260630000000_locana_schema.sql](file:///e:/Locana-Loyalty/supabase/migrations/20260630000000_locana_schema.sql)

Buka dashboard **Supabase** -> **SQL Editor** -> **New Query**, tempelkan isi berkas tersebut, lalu jalankan (**Run**). Perintah ini akan:
1. Membuat tabel-tabel utama (`profiles`, `loyalty_progress`, `reward_rules`, `rewards`, `scan_logs`).
2. Mengaktifkan Row Level Security (RLS) di seluruh tabel secara ketat.
3. Membuat trigger otomatis untuk melengkapi profil & loyalty progress customer saat mereka melakukan sign-up.
4. Mendaftarkan RPC postgres function (`add_stamp`, `redeem_reward`) untuk operasi yang aman dan mutabel.

**Jalankan juga migrasi perbaikan RLS** (wajib, mencegah error *infinite recursion* pada policy `profiles`):
- **File Migrasi**: [supabase/migrations/20260630010000_fix_rls_recursion.sql](file:///e:/Locana-Loyalty/supabase/migrations/20260630010000_fix_rls_recursion.sql)

Tempelkan isinya di **SQL Editor** dan jalankan setelah migrasi skema di atas. Migrasi ini membuat helper `get_my_role()`, `is_owner()`, `is_staff()` (SECURITY DEFINER) lalu membangun ulang policy SELECT tanpa subquery rekursif ke `profiles`. Jika memakai Supabase CLI, cukup `supabase db push` untuk menjalankan kedua migrasi sesuai urutan timestamp.

### 4. Membuat Akun Owner Pertama (Seeding)
Guna masuk pertama kali sebagai Owner, Anda dapat memicu pembuatan akun secara manual. 
Buka dashboard **Supabase** -> **Authentication** -> **Add User** -> **Create User**:
- Masukkan Email & Password untuk Owner.
- Setelah user dibuat, buka **Table Editor** -> tabel **profiles** -> temukan baris user id yang baru saja dibuat.
- Ubah nilai kolom **role** dari `customer` menjadi `owner`.
- Simpan perubahan. Akun ini sekarang memiliki otorisasi penuh sebagai Owner Locana.

*Alternatif pengujian: Anda juga dapat menjalankan query pengujian yang berada di [test_queries.sql](file:///e:/Locana-Loyalty/supabase/migrations/test_queries.sql) di dalam SQL Editor Supabase untuk langsung membuat simulasi akun Owner, Kasir, dan Customer serta menguji seluruh alur stempel.*

---

## Menjalankan Proyek secara Lokal

### Mode Pengembangan (Development)
Menjalankan local server:
```bash
npm run dev
```
Aplikasi akan dapat diakses di [http://localhost:3000](http://localhost:3000).

### Build Produksi
Membuat bundle produksi Next.js untuk dideploy:
```bash
npm run build
```

### Linting Kode
Memeriksa kualitas kode TypeScript & ESLint:
```bash
npm run lint
```

---

## Hak Akses & Proteksi Rute (Middleware)

Akses halaman di Locana dilindungi secara otomatis di server-side oleh Next.js Proxy (`proxy.ts`) berbasis role profil pengguna di Supabase:
- `/login`, `/register` -> Rute publik (jika sudah login, otomatis dialihkan ke menu utama masing-masing role).
- `/home`, `/rewards`, `/history`, `/settings` -> Hanya diizinkan untuk role `customer`.
- `/scan` -> Hanya diizinkan untuk role `kasir` dan `owner`.
- `/dashboard`, `/kasir-management`, `/reward-rules`, `/activity-logs` -> Hanya diizinkan untuk role `owner`.
