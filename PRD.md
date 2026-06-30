# PRD — Locana (Loyalty App untuk Cafe)

## 1. Ringkasan Proyek

**Nama produk:** Locana
**Jenis bisnis target:** Cafe (single outlet, bukan multi-cabang/multi-tenant)
**Tujuan:** Menggantikan kartu stempel loyalty fisik dengan sistem digital berbasis QR code. Pelanggan mengumpulkan "stamp" setiap kali transaksi, dan saat mencapai target tertentu otomatis mendapat reward yang bisa ditukar di kasir.

**Prinsip pembangunan:** Seluruh stack harus bisa dijalankan 100% gratis, tanpa memerlukan input kartu kredit/debit di provider manapun (Supabase Free Tier, Vercel Hobby Plan, library open-source).

---

## 2. User Roles

### 2.1 Owner
- Memantau seluruh data dan aktivitas cafe.
- Mengelola akun Kasir (create, update, deactivate/delete) langsung dari aplikasi.
- Mengatur konfigurasi program loyalty:
  - Target stamp untuk mendapat reward (configurable, bisa beda per jenis reward).
  - Jenis-jenis reward yang tersedia (mis. "Minuman Gratis", "Diskon 20%", dll), masing-masing dengan target stamp sendiri.
- Melihat dashboard statistik: total customer, total scan/transaksi, reward yang sudah di-redeem, customer paling aktif, tren harian/mingguan.
- Melihat log aktivitas kasir (siapa scan kapan, untuk audit).

### 2.2 Kasir
- Login ke akun yang dibuatkan Owner (tidak bisa self-register).
- Scan QR customer menggunakan kamera device (HP/tablet/laptop) langsung dari browser.
- Setelah scan, sistem menampilkan profil singkat customer (nama, progress stamp saat ini) dan dua aksi yang mungkin tersedia:
  - **Tambah Stamp** — dipakai setelah customer menyelesaikan pembayaran.
  - **Redeem Reward** — muncul hanya jika customer punya reward aktif yang belum dipakai.
- Tidak bisa melihat data customer lain di luar proses scan, dan tidak bisa mengubah konfigurasi program loyalty.

### 2.3 Customer
- Register/login menggunakan email + password.
- Memiliki QR code unik yang statis (tidak berubah-ubah), bisa diakses kapan saja dari halaman utama/profil.
- Melihat progress stamp saat ini (mis. 6/10) dengan indikator visual (progress bar/badge).
- Melihat daftar reward yang dimiliki (status: available / used) beserta riwayat.
- Melihat riwayat kunjungan/scan (tanggal, jumlah stamp didapat).
- Mengubah bahasa aplikasi (Indonesia / Inggris) lewat Settings.

---

## 3. Alur Utama (Core Flow)

### 3.1 Mendapatkan Stamp
1. Customer selesai order dan bayar di kasir secara normal (di luar sistem ini — Locana tidak menangani pembayaran/POS).
2. Customer membuka aplikasi (web), menunjukkan QR code statis miliknya ke Kasir.
3. Kasir membuka halaman Scan, mengarahkan kamera ke QR tersebut.
4. Sistem mengenali customer, menampilkan progress saat ini, lalu Kasir menekan tombol **Tambah Stamp**.
5. Stamp customer bertambah 1. Jika progress mencapai target salah satu reward, sistem otomatis:
   - Membuat record reward baru dengan status `available` untuk customer tersebut.
   - Mereset progress stamp ke 0 (atau sesuai aturan yang ditentukan Owner — lihat catatan di bawah).
6. Setiap scan tercatat di `scan_logs` (siapa kasirnya, kapan, hasil aksinya apa) untuk keperluan audit dan anti-abuse.

### 3.2 Redeem Reward
1. Customer yang punya reward `available` menunjukkan QR statis yang sama ke Kasir (tidak ada QR terpisah untuk redeem).
2. Kasir scan QR seperti biasa. Sistem mendeteksi ada reward aktif dan menampilkan tombol **Redeem Reward** di samping tombol Tambah Stamp.
3. Kasir menekan Redeem setelah reward benar-benar diberikan ke customer (mis. minuman gratis sudah dibuat).
4. Status reward berubah jadi `used`, tercatat waktrunya, dan tercatat di `scan_logs`.

### 3.3 Anti-Abuse untuk QR Statis
Karena QR bersifat statis, ada risiko penyalahgunaan (screenshot dibagikan, dsb). Mitigasi untuk MVP:
- **Cooldown**: sistem menolak penambahan stamp untuk customer yang sama jika sudah ada scan sukses dalam X menit terakhir (durasi default disarankan 5–10 menit, bisa di-hardcode dulu, opsional configurable oleh Owner di iterasi berikutnya).
- **Audit log**: semua scan (berhasil maupun ditolak karena cooldown) tercatat lengkap dengan kasir & waktu, agar Owner bisa investigasi jika ada kejanggalan.
- Rotating/dynamic QR token tidak termasuk MVP, namun arsitektur database sebaiknya tidak menutup kemungkinan ini di masa depan (catatan untuk developer/agent).

---

## 4. Fitur per Modul

### 4.1 Auth
- Register & login via email + password (Supabase Auth).
- Role disimpan di tabel `profiles`, ditentukan saat akun dibuat:
  - Customer: self-register lewat halaman publik.
  - Kasir: dibuat oleh Owner lewat dashboard (bukan self-register).
  - Owner: akun pertama dibuat manual (seed) saat setup awal proyek.

### 4.2 Dashboard Owner
- Ringkasan statistik (total customer, total scan hari ini/minggu ini, reward ter-redeem).
- Manajemen Kasir: tabel list kasir + form tambah/edit/nonaktifkan.
- Manajemen Reward Rules: CRUD jenis reward (nama, target stamp, deskripsi, aktif/nonaktif).
- Log aktivitas: tabel scan_logs dengan filter tanggal & kasir.
- Daftar customer dengan progress masing-masing (read-only).

### 4.3 Dashboard Kasir
- Halaman utama berupa Scanner (akses kamera browser).
- Setelah scan sukses: tampilkan kartu info customer (nama, progress, reward aktif jika ada) + tombol aksi.
- Riwayat scan yang dilakukan kasir tersebut hari ini (opsional, untuk transparansi).

### 4.4 Dashboard Customer
- Halaman utama: QR code besar + progress bar stamp saat ini.
- Halaman Rewards: list reward (available/used) dengan tanggal.
- Halaman Riwayat: histori penambahan stamp.
- Settings: ubah bahasa (ID/EN), ubah profil dasar (nama), logout.

### 4.5 Localization
- Bahasa default: Indonesia.
- Tersedia toggle Indonesia ⇄ Inggris di Settings, berlaku di seluruh role (Owner, Kasir, Customer).
- Gunakan struktur i18n yang mudah ditambah bahasa baru di masa depan walau saat ini hanya 2 bahasa.

---

## 5. Skema Data (Gambaran Tingkat Tinggi)

> Detail kolom & RLS policy disusun di tahap implementasi oleh coding agent, ini sebagai acuan awal.

- **profiles** — id (ref auth.users), role (`owner` | `kasir` | `customer`), full_name, email, created_at.
- **loyalty_progress** — customer_id, current_stamps, updated_at.
- **reward_rules** — id, name, description, target_stamps, is_active, created_by (owner).
- **rewards** — id, customer_id, reward_rule_id, status (`available` | `used`), earned_at, used_at, redeemed_by_kasir_id.
- **scan_logs** — id, customer_id, kasir_id, action (`add_stamp` | `redeem_reward` | `rejected_cooldown`), created_at.

---

## 6. Tech Stack

| Layer | Pilihan | Catatan |
|---|---|---|
| Frontend & Backend | Next.js 15 (App Router) | Full-stack dalam satu framework |
| Database & Auth | Supabase (Postgres + Supabase Auth) | Free tier, RLS untuk keamanan antar role |
| Realtime (opsional) | Supabase Realtime | Update progress customer tanpa refresh |
| QR Generate | `qrcode` (npm) | Generate QR dari customer ID/token |
| QR Scan | `html5-qrcode` atau `@yudiel/react-qr-scanner` | Akses kamera langsung dari browser, tanpa app native |
| Styling | Tailwind CSS + shadcn/ui | Cepat untuk 3 jenis dashboard berbeda |
| Chart/Statistik | Recharts | Dashboard Owner |
| i18n | `next-intl` atau `next-i18next` | Mendukung toggle ID/EN |
| Hosting | Vercel (Hobby Plan) | Gratis, tanpa kartu kredit, auto-deploy dari GitHub |

**Syarat mutlak:** Semua layanan yang dipakai harus punya free tier yang tidak mewajibkan kartu kredit/debit untuk sign up maupun pemakaian dasar.

---

## 7. Non-Functional Requirements

- **Keamanan**: Row Level Security (RLS) di Supabase wajib aktif — customer hanya bisa baca data miliknya sendiri, kasir hanya bisa insert ke scan_logs & update stamp/reward lewat fungsi terbatas (bukan akses langsung ke seluruh tabel), owner full akses.
- **Responsif**: Harus nyaman dipakai di HP (customer & kasir kemungkinan besar akses dari mobile browser).
- **Biaya**: Zero-cost untuk skala 1 cafe, tanpa kartu kredit di provider manapun.
- **Audit Trail**: Semua perubahan stamp/reward harus tercatat (tidak ada hard delete pada scan_logs).

---

## 8. Out of Scope (MVP ini)

- Tidak menangani pembayaran/POS (di luar sistem).
- Tidak ada multi-cabang/multi-tenant.
- Tidak ada notifikasi push/SMS/WhatsApp (bisa jadi iterasi berikutnya).
- Tidak ada rotating/dynamic QR token (statis dulu, dengan cooldown sebagai mitigasi).
- Tidak ada native mobile app (web-based, mobile-responsive).

## 9. Kemungkinan Iterasi Berikutnya

- Reward rules dengan tingkat (tier) loyalty (Bronze/Silver/Gold).
- Notifikasi (email) saat customer dapat reward baru.
- Configurable cooldown duration oleh Owner.
- Dynamic/rotating QR token untuk keamanan lebih tinggi.
