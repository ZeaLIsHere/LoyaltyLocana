# Locana — Redesign & Penyelesaian (Design Spec)

**Tanggal:** 2026-06-30
**Konteks:** Implementasi awal oleh agent sebelumnya secara teknis berfungsi (build lulus) namun
ditolak karena (1) UI terasa generik/jelek dan tidak konsisten, dan (2) beberapa fitur belum
lengkap/dipoles. Backend (migrasi, RPC, server actions) solid dan dipertahankan dengan perbaikan minimal.

Sumber kebenaran produk: `PRD.md`. Aturan teknis: `AGENTS.md`. Spec ini menambahkan keputusan
desain & lingkup pengerjaan ulang.

## Tujuan

1. Memberi Locana **identitas visual "Cafe Cozy"** yang konsisten dan berkarakter di semua role.
2. Menghapus seluruh warna/teks hardcoded; semua warna lewat design token, semua teks lewat i18n.
3. Memperbaiki bug RLS recursion dan memverifikasi alur end-to-end.
4. Mempertahankan build hijau (`next build`) dan kesiapan deploy Vercel.

Non-goals (tetap mengikuti PRD bagian 8): tidak ada POS/pembayaran, multi-tenant, push notif,
dynamic QR, atau native app.

## Keputusan Desain

### Design system "Cafe Cozy"
- **Warna (OKLCH), light mode:**
  - background: krem susu hangat (mis. `oklch(0.98 0.012 75)`)
  - foreground/primary: espresso coklat tua (`oklch(0.28 0.03 50)`)
  - accent: amber/caramel (`oklch(0.74 0.13 65)`) untuk progress, highlight, CTA sekunder
  - success/sage: hijau lembut untuk status reward available
  - card: putih krem sedikit lebih terang dari background, border hangat low-chroma
- **Dark mode:** dirancang penuh — background coklat-hitam hangat (bukan abu netral), accent amber
  tetap menonjol, kontras AA terjaga.
- **Tipografi:** heading pakai **Fraunces** (serif hangat/artisan, via `next/font/google`),
  body pakai sans bersih (Inter/Geist yang sudah ada). Token `--font-heading` dipakai konsisten.
- **Bentuk & motif:** radius lembut, shadow halus berwarna hangat, ikon kopi/stempel (lucide
  `Coffee`, `Stamp`, `Award`) sebagai motif berulang. QR card dan stamp-grid jadi elemen hero.
- Semua token didefinisikan sekali di `app/globals.css`; komponen hanya memakai kelas token
  (`bg-background`, `text-primary`, `bg-accent`, dst.) — tidak ada `amber-500`/`stone-900` hardcoded.

### Cakupan UI yang dirombak (semua role — "rombak semua sekaligus")
- **Auth:** `/login`, `/register` — layout terbranding, konsisten dengan tema.
- **Customer:** `/home` (QR + stamp grid + milestone), `/rewards`, `/history`, `/settings`
  (lengkapi: toggle bahasa ID/EN berfungsi, edit nama, logout) + navigasi bawah.
- **Kasir:** `/scan` — kamera, kartu hasil scan customer, tombol Tambah Stamp & Redeem,
  state feedback (sukses/cooldown/error) jelas.
- **Owner:** `/dashboard` (statistik + chart Recharts bertema hangat), `/kasir-management` (CRUD),
  `/reward-rules` (CRUD), `/activity-logs` (tabel + filter) + sidebar.

### Perbaikan backend (minimal, terarah)
- **Bug RLS recursion:** policy yang mengecek role dengan `select ... from profiles` di dalam
  policy tabel `profiles` menyebabkan rekursi. Perbaiki dengan helper
  `public.get_my_role()` / `public.is_owner()` ber-`SECURITY DEFINER` yang membaca role tanpa
  memicu RLS, lalu pakai helper itu di semua policy lintas-tabel. Tulis sebagai migrasi baru
  (idempoten, `create or replace` / `drop policy if exists`) agar bisa dijalankan ulang.
- Tidak mengubah skema tabel kecuali diperlukan untuk perbaikan di atas.

### i18n
- Semua string UI dipindah ke `messages/id.json` & `messages/en.json` dengan struktur namespace
  per area (auth, customer, kasir, owner, common). Tidak ada teks literal di komponen.
- Toggle bahasa di Settings menyimpan preferensi (cookie locale yang dibaca `next-intl`) dan
  berlaku di seluruh role.

## Arsitektur (tetap)
- Next.js 16 App Router + TypeScript, route group per role, middleware proteksi role (sudah ada).
- Supabase (Postgres + Auth + RLS), RPC `add_stamp`/`redeem_reward`, service-role hanya di server.
- Operasi sensitif lewat server action/RPC tervalidasi role.

## Strategi Verifikasi
1. `next build` harus lulus tanpa error/warning baru.
2. Audit manual: tidak ada warna/teks hardcoded tersisa (grep `stone-`, `amber-`, literal string).
3. Uji alur end-to-end (manual oleh user dengan panduan, karena butuh Supabase live):
   register customer → QR muncul → kasir scan → stamp +1 → capai target → reward `available`
   → kasir redeem → status `used`; cooldown menolak scan <5 menit; log tercatat.
4. Cek RLS: owner lihat semua, customer hanya miliknya, kasir hanya scan_logs miliknya.
5. Toggle ID/EN benar di semua halaman.

## Risiko & Catatan
- Proyek belum git repo → dokumen ini tidak di-commit (akan di-`git init` bila user mau).
- Verifikasi alur penuh butuh kredensial Supabase user; agent menyediakan langkah & SQL,
  eksekusi final terhadap DB live dilakukan/diawasi user.
- Fraunces ditarik via `next/font/google` (gratis, tanpa kartu kredit) — sesuai hard constraint.
