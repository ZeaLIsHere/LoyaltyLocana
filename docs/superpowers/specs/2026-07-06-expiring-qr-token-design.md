# Desain: QR Pelanggan Berbatas Waktu (Expiring QR Token)

**Tanggal:** 2026-07-06
**Status:** Disetujui (menunggu implementasi)

## Latar Belakang & Masalah

QR pelanggan saat ini berisi **UUID customer mentah yang statis** (`components/home-client.tsx:33`).
Kasir memindai QR → mendapat UUID → langsung dipakai untuk `add_stamp` / `redeem`.
Karena UUID tidak pernah berubah, siapa pun yang men-screenshot QR seorang pelanggan
dapat memakainya selamanya (atau membagikannya ke teman untuk mengumpulkan stamp curang).

## Tujuan

QR menjadi **token berbatas waktu yang divalidasi server**. Ketika durasinya habis,
layar pelanggan otomatis membuat QR baru. Screenshot lama ditolak kasir karena token
yang di dalamnya sudah kadaluarsa.

Tujuan ini bersifat **keamanan sungguhan** (bukan sekadar refresh visual): validasi
kadaluarsa ditegakkan di sisi server.

## Pendekatan yang Dipilih: Token Bertanda-tangan (HMAC), Stateless

QR berisi token yang ditandatangani server dengan HMAC-SHA256. Verifikasi cukup dengan
menghitung ulang tanda tangan + mengecek waktu kadaluarsa — **tanpa tabel database baru**,
tanpa bersih-bersih token, tanpa dependency pihak ketiga (pakai modul `crypto` bawaan Node).

Pendekatan alternatif (tabel token di DB dengan sekali-pakai) ditolak karena berlebihan
untuk cafe single-outlet: butuh migration, RLS, dan pembersihan token kadaluarsa.

## Parameter

| Parameter | Nilai |
|-----------|-------|
| TTL token (masa berlaku QR) | **60 detik** |
| Toleransi verifikasi (clock skew / QR baru berganti) | **15 detik** |
| Algoritma tanda tangan | HMAC-SHA256 (`crypto` bawaan Node) |
| Secret | env `QR_SIGNING_SECRET` (server-only) |

## Komponen

### 1. Util token — file baru `lib/qr-token.ts` (server-only)

- `signQrToken(customerId: string): { token: string; expiresAt: number }`
  - Payload: `v1.<customerId>.<expiryMs>` di mana `expiryMs = Date.now() + 60_000`.
  - Signature = HMAC-SHA256(payload, QR_SIGNING_SECRET).
  - `token = base64url(payload) + "." + base64url(signature)`.
- `verifyQrToken(token: string): { valid: boolean; customerId?: string; reason?: 'invalid' | 'expired' }`
  - Parse token → payload + signature.
  - Hitung ulang HMAC, bandingkan **constant-time** (`crypto.timingSafeEqual`). Tidak cocok → `{ valid:false, reason:'invalid' }`.
  - Cek `Date.now() > expiryMs + 15_000` → `{ valid:false, reason:'expired' }`.
  - Valid → `{ valid:true, customerId }`.
- `QR_SIGNING_SECRET` tidak ada → lempar error jelas (fail-closed, **tidak ada fallback tidak aman**).
- Konstanta TTL & toleransi didefinisikan di file ini (satu tempat, mudah diubah).

### 2. Server actions (`lib/supabase/actions.ts`)

- **Baru** `mintQrToken()`:
  - Ambil user login via `supabase.auth.getUser()`.
  - Tandatangani **id user itu sendiri** — pelanggan hanya bisa membuat token untuk dirinya.
  - Return `{ success, token, expiresAt }` atau `{ success:false, error }`.
- **Ubah** `fetchCustomerScanData(token: string)` (sebelumnya menerima `customerId`):
  - Verifikasi token lebih dulu (`verifyQrToken`).
  - `reason:'expired'` → return error `kasir.qrExpired`; `reason:'invalid'` → error `kasir.qrInvalid`.
  - Valid → pakai `customerId` hasil resolve, lalu jalankan logika lama (validasi caller staff,
    ambil profil + progress + reward rules).
- `addStampAction(customerId)` / `redeemRewardRuleAction(customerId, ruleId)` **tidak berubah**.
  Aman karena kasir sudah terautentikasi sebagai staff; token hanya perlu divalidasi di titik
  scan untuk mengidentifikasi pelanggan.

### 3. UI Customer (`components/home-client.tsx`)

- Ganti `QRCode.toDataURL(customerId)` statis dengan alur berbasis token:
  - Saat mount, panggil `mintQrToken()`; render QR dari `token` yang dikembalikan.
  - Simpan `expiresAt`; pasang timer untuk mint ulang tepat saat kadaluarsa → QR berganti sendiri.
  - Tampilkan **hitung mundur** ("QR diperbarui dalam m:ss") menggantikan baris UUID mentah
    (`home-client.tsx:77`) — menampilkan token mentah tidak berguna & jelek.
  - Gagal mint (offline/sesi habis) → tampilkan pesan + tombol coba lagi.
- Prop `customerId` tidak lagi dipakai untuk QR (token di-mint dari sesi auth di server).

### 4. UI Kasir (`components/scan-client.tsx`)

- `loadCustomerData(decodedText)` meneruskan `decodedText` (kini sebuah token) ke
  `fetchCustomerScanData(token)`.
- Tampilkan pesan error baru saat token kadaluarsa/invalid (mis. toast:
  "QR kadaluarsa — minta pelanggan menyegarkan layar").
- Logika `rescan-guard` tetap berjalan tanpa perubahan (token berbeda tiap rotasi, jadi
  perbandingan `lastScannedRef` tetap benar dalam jendela 3 detiknya).

### 5. Environment & Dokumentasi

- Tambah `QR_SIGNING_SECRET=` ke `.env.local.example`.
- Catatan di README: cara generate (`openssl rand -hex 32`) dan bahwa variabel ini
  **server-only** (tidak boleh ber-prefix `NEXT_PUBLIC_`). Perlu di-set juga di Vercel.

### 6. i18n (`messages/id.json` & `messages/en.json`)

Key baru:
- `customer.qrRefreshIn` — label hitung mundur (mis. "QR diperbarui dalam {time}").
- `customer.qrError` — pesan gagal membuat QR.
- `kasir.qrExpired` — "QR kadaluarsa, minta pelanggan menyegarkan layar".
- `kasir.qrInvalid` — "QR tidak valid".

## Batasan yang Diterima (Trade-off)

- Dalam jendela 60 detik, satu token bisa terpindai lebih dari sekali. Ini diredam oleh
  **cooldown add-stamp 10 detik** yang sudah ada. Token **tidak** dibuat sekali-pakai untuk
  menghindari kompleksitas tabel/penyimpanan.
- Rotasi QR membutuhkan koneksi (server action per rotasi). Wajar karena aplikasi memang
  butuh koneksi untuk berfungsi.

## Rencana Pengujian

- **Manual:**
  1. Customer buka `/home` → QR tampil, hitung mundur berjalan, setelah 60 detik QR berganti.
  2. Kasir scan QR segar → data pelanggan muncul, add stamp & redeem berfungsi.
  3. Kasir scan token kadaluarsa (tunggu >75 detik pada screenshot) → muncul pesan "kadaluarsa".
  4. Kasir scan string sembarang / UUID lama → muncul pesan "tidak valid".
- **Opsional (unit test util token):** valid, kadaluarsa, tanda tangan dipalsukan → hasil sesuai.

## Definisi Selesai

- QR pelanggan berganti otomatis tiap 60 detik tanpa aksi manual.
- Kasir hanya bisa memproses token yang valid & belum kadaluarsa; token basi ditolak dengan
  pesan yang jelas.
- Alur penuh (scan → add stamp → capai target → redeem) tetap berjalan dengan token baru.
- `next build` sukses tanpa error; `QR_SIGNING_SECRET` terdokumentasi.
