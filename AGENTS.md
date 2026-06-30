# AGENTS.md — Panduan untuk Coding Agent (Locana)

Dokumen ini adalah instruksi kerja untuk AI coding agent (Claude Code) yang akan membangun proyek **Locana** dari nol hingga selesai. Agent diharapkan bekerja secara mandiri mengikuti spesifikasi di `PRD.md`, dan dokumen ini berisi aturan teknis, urutan kerja, serta batasan yang wajib dipatuhi.

---

## 1. Konteks Proyek

Locana adalah aplikasi loyalty digital berbasis QR untuk sebuah cafe (single outlet). Tiga role: Owner, Kasir, Customer. Baca `PRD.md` di root proyek ini secara penuh sebelum mulai coding — dokumen ini adalah sumber kebenaran untuk requirement produk. AGENTS.md ini adalah sumber kebenaran untuk *bagaimana* membangunnya secara teknis.

---

## 2. Tech Stack Wajib

- **Framework**: Next.js 15, App Router, TypeScript (bukan JavaScript biasa).
- **Database & Auth**: Supabase (Postgres + Supabase Auth, email/password).
- **Styling**: Tailwind CSS + shadcn/ui.
- **QR Generate**: `qrcode`.
- **QR Scan**: `html5-qrcode` (atau alternatif setara yang berjalan murni di browser, tanpa native app).
- **Chart**: Recharts untuk dashboard Owner.
- **i18n**: `next-intl`, dengan 2 locale awal: `id` (default) dan `en`.
- **Realtime** (opsional, kerjakan setelah fitur inti selesai): Supabase Realtime untuk update progress customer secara live.
- **Hosting target**: Vercel (tidak perlu disetup oleh agent, cukup pastikan proyek deploy-ready).

### Batasan Keras (Hard Constraints)
- **DILARANG** menambahkan dependency atau layanan pihak ketiga apapun yang berbayar atau mewajibkan kartu kredit/debit untuk digunakan, walau hanya di free tier-nya. Jika ragu, gunakan layanan yang sudah disebut di atas atau library open-source yang jalan secara lokal/self-contained.
- **DILARANG** membuat sistem pembayaran/POS. Pembayaran terjadi di luar sistem ini.
- **DILARANG** menyimpan QR code sebagai token yang bisa ditebak (gunakan UUID v4 atau setara untuk identifier customer di dalam QR, bukan auto-increment id biasa).

---

## 3. Struktur Proyek (acuan)

```
/app
  /(auth)
    /login
    /register
  /(owner)
    /dashboard
    /kasir-management
    /reward-rules
    /activity-logs
  /(kasir)
    /scan
  /(customer)
    /home          -> QR code + progress
    /rewards
    /history
    /settings
/components
/lib
  /supabase        -> client & server helpers
  /i18n
/types
/supabase
  /migrations      -> SQL migration files
```

Sesuaikan struktur ini sesuai kebutuhan, tapi pertahankan pemisahan jelas antar 3 role baik dari sisi routing maupun middleware/proteksi akses.

---

## 4. Database & Row Level Security (RLS)

Buat migration SQL di `/supabase/migrations`. Tabel minimal mengikuti `PRD.md` bagian 5, dengan tambahan ketentuan berikut:

- Semua tabel WAJIB mengaktifkan RLS (`ENABLE ROW LEVEL SECURITY`).
- **profiles**: user hanya bisa SELECT/UPDATE row miliknya sendiri. Owner bisa SELECT semua row (cek role di policy).
- **loyalty_progress**: customer hanya bisa SELECT miliknya sendiri. INSERT/UPDATE hanya boleh lewat Postgres function/RPC yang dipanggil saat aksi kasir (`add_stamp`, `redeem_reward`), bukan lewat akses tabel langsung dari client kasir. Ini mencegah kasir memanipulasi data secara langsung dari client.
- **rewards**: sama prinsipnya — customer read-only untuk rewardnya sendiri, perubahan status hanya lewat RPC.
- **scan_logs**: insert-only lewat RPC, tidak ada update/delete dari client manapun (audit trail harus immutable). Owner bisa SELECT semua, kasir hanya bisa SELECT log miliknya sendiri (opsional), customer tidak punya akses langsung.
- **reward_rules**: hanya Owner yang bisa INSERT/UPDATE/DELETE. Semua role bisa SELECT rule yang `is_active = true` (untuk ditampilkan di UI customer).

Buat Postgres function (RPC) berikut, dipanggil dari sisi server (Next.js server action / route handler) menggunakan service role atau melalui RLS dengan validasi role:

- `add_stamp(customer_id uuid, kasir_id uuid)` — cek cooldown, tambah stamp, cek apakah mencapai target reward manapun, jika ya buat reward + reset stamp, insert ke scan_logs.
- `redeem_reward(reward_id uuid, kasir_id uuid)` — validasi reward masih `available`, ubah jadi `used`, insert ke scan_logs.

Implementasi cooldown: simpan/cek `created_at` terakhir dari `scan_logs` dengan action `add_stamp` untuk customer tersebut, tolak jika kurang dari durasi cooldown (mulai dengan konstanta 5 menit, taruh di satu tempat yang mudah diubah, misal `lib/constants.ts` atau sebagai parameter di function SQL).

---

## 5. Auth & Role Handling

- Gunakan Supabase Auth untuk register/login (email + password).
- Saat customer register lewat halaman publik, otomatis insert row `profiles` dengan role `customer` dan buat `loyalty_progress` awal (current_stamps = 0) — bisa pakai Postgres trigger `on_auth_user_created`.
- Akun Kasir TIDAK bisa dibuat lewat halaman register publik. Hanya Owner yang bisa membuat akun Kasir lewat dashboard (gunakan Supabase Admin API / service role key di server action, bukan di client).
- Akun Owner pertama dibuat manual lewat seed script atau langsung lewat Supabase dashboard saat setup awal — dokumentasikan langkah ini di README, bukan di-build sebagai fitur UI.
- Buat middleware Next.js untuk proteksi route berdasarkan role: customer tidak bisa akses `/(owner)/*` atau `/(kasir)/*`, dst.

---

## 6. Urutan Pengerjaan yang Disarankan

1. Setup project Next.js 15 + TypeScript + Tailwind + shadcn/ui.
2. Setup Supabase project (struktur migration, RLS, RPC functions) — buat sebagai file SQL yang bisa dijalankan, jangan asumsikan project Supabase sudah ada isinya.
3. Implementasi Auth (register/login customer, middleware proteksi role).
4. Dashboard Customer: tampilkan QR code (generate dari customer id), progress bar.
5. Dashboard Kasir: scanner QR, tampilkan hasil scan, tombol Tambah Stamp.
6. Logic reward: trigger otomatis saat target tercapai, tombol Redeem di Kasir.
7. Dashboard Owner: statistik, manajemen Kasir (CRUD), manajemen Reward Rules (CRUD), log aktivitas.
8. i18n: setup next-intl, terjemahkan seluruh UI ke ID & EN.
9. Realtime update (opsional, terakhir).
10. Review keamanan RLS sekali lagi sebelum dianggap selesai — pastikan tidak ada tabel yang bisa diakses/diubah dari role yang salah.

Kerjakan secara bertahap sesuai urutan di atas. Setelah tiap tahap besar selesai, jalankan build/lint untuk memastikan tidak ada error sebelum lanjut ke tahap berikutnya.

---

## 7. Environment Variables

Buat file `.env.local.example` (jangan commit `.env.local` asli) berisi minimal:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` hanya boleh dipakai di server-side code (server actions/route handlers), TIDAK BOLEH ter-expose ke client.

---

## 8. Hal yang Harus Dihindari Agent

- Jangan membuat akses database langsung dari client component untuk operasi sensitif (tambah stamp, redeem reward, kelola kasir) — selalu lewat server action / RPC yang sudah divalidasi role-nya di server.
- Jangan menambahkan dependency berbayar atau yang butuh API key dari layanan berbayar.
- Jangan membuat fitur di luar scope `PRD.md` tanpa memberi catatan/komentar bahwa itu adalah penambahan di luar spesifikasi awal.
- Jangan hardcode credential apapun di source code — semua lewat environment variables.

---

## 9. Definisi "Selesai" (Definition of Done)

- Ketiga role (Owner, Kasir, Customer) bisa login dan mengakses dashboard masing-masing sesuai hak aksesnya.
- Alur penuh berhasil dites: customer register → dapat QR → kasir scan → stamp bertambah → mencapai target → reward muncul → kasir redeem reward → status reward berubah jadi used.
- RLS aktif dan benar di semua tabel (tidak ada role yang bisa mengakses/mengubah data di luar haknya).
- UI bisa berganti bahasa ID/EN dengan benar di seluruh halaman.
- Project berhasil di-build tanpa error (`next build`) dan siap di-deploy ke Vercel.
- README berisi instruksi setup Supabase (migration, seed Owner pertama) dan environment variables yang dibutuhkan.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
