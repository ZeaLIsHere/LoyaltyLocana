# Locana Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memberi Locana identitas visual "Cafe Cozy" yang konsisten di semua role, menghapus warna/teks hardcoded, memperbaiki bug RLS recursion, dan menjaga build hijau.

**Architecture:** Next.js 16 App Router + TypeScript, route group per role (sudah ada). Backend Supabase (migrasi/RPC/server actions) dipertahankan. Perubahan inti adalah design-token sweep di `app/globals.css` + `next/font` Fraunces, lalu setiap komponen UI ditulis ulang memakai token & key i18n (tanpa warna/teks literal). Satu migrasi baru memperbaiki RLS recursion.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4 (`@theme inline`), shadcn/ui, next-intl, qrcode, html5-qrcode, Recharts, Fraunces (next/font/google), Supabase.

## Global Constraints

- Next.js 16 App Router, TypeScript only (no plain JS components). (AGENTS.md §2)
- DILARANG menambah dependency berbayar / yang butuh kartu kredit. Fraunces via `next/font/google` = gratis. (AGENTS.md §2)
- DILARANG akses DB langsung dari client untuk operasi sensitif — selalu lewat server action/RPC tervalidasi role. (AGENTS.md §8)
- Tidak ada credential hardcoded; service-role key hanya di server. (AGENTS.md §7)
- Default locale `id`, dukung `id` & `en`; semua string UI lewat next-intl, tidak ada teks literal di komponen. (PRD §4.5)
- Semua warna lewat design token di `app/globals.css` — TIDAK ada kelas warna mentah (`stone-*`, `amber-*`, `#hex`) di komponen.
- Cooldown stamp = 5 menit, konstanta di `lib/constants.ts` / SQL. (AGENTS.md §4)
- RLS wajib aktif & benar di semua tabel. (PRD §7)

**Catatan verifikasi:** Repo ini belum punya test framework (tidak ada di `package.json`) dan ini adalah redesign visual + SQL. Maka "test cycle" tiap task = kombinasi: (a) `npx next build` lulus tanpa error baru, (b) grep audit anti-hardcoded, (c) cek visual manual / checklist alur. Tidak menambah framework test unit baru (di luar scope, YAGNI). Commit di akhir tiap task **hanya jika repo sudah git** — jalankan `git init` di Task 0 bila user setuju; jika tidak, lewati langkah commit.

---

### Task 0: Inisialisasi git (opsional, sekali di awal)

**Files:** none (repo-level)

- [ ] **Step 1:** Konfirmasi ke user apakah boleh `git init`. Jika tidak, lewati seluruh task ini dan abaikan semua langkah "Commit" di task berikutnya.
- [ ] **Step 2:** Jika ya:

```bash
cd /e/Locana-Loyalty
git init
git add -A
git commit -m "chore: baseline before redesign"
```

Expected: commit dibuat. `.gitignore` sudah ada (mengabaikan `.next`, `node_modules`, `.env.local`).

---

### Task 1: Design tokens "Cafe Cozy" + font Fraunces

**Files:**
- Modify: `app/globals.css` (blok `:root` & `.dark`, dan `@theme inline` untuk `--font-heading`)
- Modify: `app/layout.tsx` (tambah Fraunces, pasang variabel font di `<html>`)

**Interfaces:**
- Produces: token CSS lengkap (`--background`, `--foreground`, `--primary`, `--accent`, `--success`, dst.) dipakai semua task UI berikutnya lewat kelas Tailwind (`bg-background`, `text-primary`, `bg-accent`, `text-success`). Variabel font `--font-fraunces` & token `--font-heading` untuk heading.

- [ ] **Step 1: Tambah Fraunces di `app/layout.tsx`**

Tambah import & instance, lalu sertakan variabel di className `<html>`:

```tsx
import { Geist, Geist_Mono, Fraunces } from "next/font/google";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});
```

Ubah `<html className={...}>` menjadi menyertakan `${fraunces.variable}`:

```tsx
className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
```

- [ ] **Step 2: Tulis ulang token warna di `app/globals.css`**

Ganti seluruh isi blok `:root { ... }` dan `.dark { ... }` dengan palet hangat OKLCH berikut (pertahankan baris `--radius`, dan token `--sidebar-*` & `--chart-*`). Set `--font-heading` ke Fraunces di `@theme inline` (ganti baris `--font-heading: var(--font-sans);`).

Di `@theme inline`, ubah:
```css
  --font-heading: var(--font-fraunces);
```

Blok `:root`:
```css
:root {
  --radius: 0.75rem;
  --background: oklch(0.973 0.013 78);
  --foreground: oklch(0.27 0.025 52);
  --card: oklch(0.99 0.008 84);
  --card-foreground: oklch(0.27 0.025 52);
  --popover: oklch(0.99 0.008 84);
  --popover-foreground: oklch(0.27 0.025 52);
  --primary: oklch(0.36 0.045 50);
  --primary-foreground: oklch(0.98 0.012 84);
  --secondary: oklch(0.93 0.022 76);
  --secondary-foreground: oklch(0.32 0.03 52);
  --muted: oklch(0.94 0.014 78);
  --muted-foreground: oklch(0.52 0.022 56);
  --accent: oklch(0.77 0.13 66);
  --accent-foreground: oklch(0.28 0.04 50);
  --success: oklch(0.62 0.085 150);
  --success-foreground: oklch(0.98 0.012 84);
  --destructive: oklch(0.55 0.18 28);
  --border: oklch(0.89 0.016 74);
  --input: oklch(0.89 0.016 74);
  --ring: oklch(0.77 0.13 66);
  --chart-1: oklch(0.77 0.13 66);
  --chart-2: oklch(0.62 0.085 150);
  --chart-3: oklch(0.55 0.07 48);
  --chart-4: oklch(0.7 0.1 90);
  --chart-5: oklch(0.5 0.05 30);
  --sidebar: oklch(0.95 0.016 76);
  --sidebar-foreground: oklch(0.3 0.025 52);
  --sidebar-primary: oklch(0.36 0.045 50);
  --sidebar-primary-foreground: oklch(0.98 0.012 84);
  --sidebar-accent: oklch(0.77 0.13 66);
  --sidebar-accent-foreground: oklch(0.28 0.04 50);
  --sidebar-border: oklch(0.88 0.016 74);
  --sidebar-ring: oklch(0.77 0.13 66);
}
```

Blok `.dark`:
```css
.dark {
  --background: oklch(0.21 0.018 52);
  --foreground: oklch(0.95 0.013 82);
  --card: oklch(0.25 0.02 52);
  --card-foreground: oklch(0.95 0.013 82);
  --popover: oklch(0.25 0.02 52);
  --popover-foreground: oklch(0.95 0.013 82);
  --primary: oklch(0.83 0.11 72);
  --primary-foreground: oklch(0.24 0.03 50);
  --secondary: oklch(0.3 0.022 52);
  --secondary-foreground: oklch(0.93 0.014 82);
  --muted: oklch(0.3 0.02 52);
  --muted-foreground: oklch(0.72 0.02 70);
  --accent: oklch(0.78 0.13 68);
  --accent-foreground: oklch(0.24 0.03 50);
  --success: oklch(0.68 0.09 150);
  --success-foreground: oklch(0.22 0.02 50);
  --destructive: oklch(0.62 0.17 28);
  --border: oklch(1 0 0 / 12%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.78 0.13 68);
  --chart-1: oklch(0.78 0.13 68);
  --chart-2: oklch(0.68 0.09 150);
  --chart-3: oklch(0.72 0.07 50);
  --chart-4: oklch(0.78 0.1 90);
  --chart-5: oklch(0.62 0.05 30);
  --sidebar: oklch(0.24 0.02 52);
  --sidebar-foreground: oklch(0.93 0.013 82);
  --sidebar-primary: oklch(0.83 0.11 72);
  --sidebar-primary-foreground: oklch(0.24 0.03 50);
  --sidebar-accent: oklch(0.78 0.13 68);
  --sidebar-accent-foreground: oklch(0.24 0.03 50);
  --sidebar-border: oklch(1 0 0 / 12%);
  --sidebar-ring: oklch(0.78 0.13 68);
}
```

- [ ] **Step 3: Daftarkan token baru di `@theme inline`**

Di blok `@theme inline` (di `app/globals.css`), tambahkan pemetaan untuk `success` agar kelas `bg-success`/`text-success` tersedia:
```css
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
```

- [ ] **Step 4: Tambah util heading (opsional, di `@layer base`)**

Tambahkan agar elemen heading default memakai Fraunces:
```css
  h1, h2, h3 {
    font-family: var(--font-heading);
    letter-spacing: -0.01em;
  }
```

- [ ] **Step 5: Verifikasi build**

Run: `npx next build`
Expected: "Compiled successfully", tanpa error baru.

- [ ] **Step 6: Verifikasi visual** — jalankan `npm run dev`, buka `/login`. Background krem hangat, teks coklat espresso, heading berserif (Fraunces). Toggle dark mode (jika ada) menampilkan coklat gelap hangat, bukan abu netral.

- [ ] **Step 7: Commit** (jika git aktif)

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat(ui): cafe-cozy design tokens + Fraunces heading font"
```

---

### Task 2: Katalog i18n lengkap (id + en)

**Files:**
- Modify: `messages/id.json`
- Modify: `messages/en.json`

**Interfaces:**
- Produces: superset key i18n yang dipakai semua task UI. Namespace: `app`, `auth`, `customer`, `kasir`, `owner`, `common`. Setiap key di `id.json` WAJIB ada padanannya di `en.json` (struktur identik).

- [ ] **Step 1: Perluas `messages/id.json`** — tambahkan key yang kurang (gabungkan dengan yang sudah ada, jangan hapus key lama). Minimal tambahan:
  - `app.greeting` = "Halo, {name}!"
  - `customer.cafeRewardTargets` = "Target Reward Cafe"
  - `customer.stampLabel` = "Stamp"
  - `customer.editName` = "Ubah Nama"
  - `customer.nameUpdated` = "Nama berhasil diperbarui"
  - `customer.rewardEarnedOn` = "Diperoleh {date}"
  - `customer.rewardUsedOn` = "Digunakan {date}"
  - `customer.historyEmpty` = "Belum ada riwayat kunjungan"
  - `customer.stampEarned` = "+{count} stamp"
  - `kasir.scanAgain` = "Scan Lagi"
  - `kasir.startScan` = "Mulai Scan"
  - `kasir.stopScan` = "Hentikan"
  - `kasir.noActiveReward` = "Tidak ada reward aktif"
  - `kasir.cameraError` = "Tidak bisa mengakses kamera"
  - `owner.welcome` = "Selamat datang kembali"
  - `owner.customersList` = "Daftar Customer"
  - `owner.weeklyTrend` = "Tren Mingguan"
  - `owner.dailyScans` = "Scan Harian"
  - `owner.topCustomers` = "Customer Teraktif"
  - `owner.kasirName` = "Nama Kasir"
  - `owner.status` = "Status"
  - `owner.action` = "Aksi"
  - `owner.date` = "Tanggal"
  - `owner.filterByDate` = "Filter tanggal"
  - `owner.filterByKasir` = "Filter kasir"
  - `owner.allKasir` = "Semua kasir"
  - `owner.createKasirSuccess` = "Akun kasir berhasil dibuat"
  - `owner.confirmPassword` = "Password kasir"
  - `common.online` / `common.offline`, `common.activate` = "Aktifkan", `common.deactivate` = "Nonaktifkan", `common.theme` = "Tema", `common.optional` = "(opsional)"

  (Tambahkan key lain yang ternyata dibutuhkan saat mengerjakan task UI; selalu update kedua file.)

- [ ] **Step 2: Mirror ke `messages/en.json`** — setiap key di atas dengan terjemahan Inggris (mis. `app.greeting` = "Hi, {name}!", `customer.cafeRewardTargets` = "Cafe Reward Targets", dst). Struktur JSON identik dengan `id.json`.

- [ ] **Step 3: Verifikasi paritas** — pastikan set key id == set key en.

Run:
```bash
node -e "const a=require('./messages/id.json'),b=require('./messages/en.json');const f=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?f(v,p+k+'.'):[p+k]);const A=new Set(f(a)),B=new Set(f(b));const miss=[...A].filter(x=>!B.has(x)).concat([...B].filter(x=>!A.has(x)));console.log(miss.length?('MISMATCH: '+miss.join(', ')):'OK: keys match')"
```
Expected: `OK: keys match`

- [ ] **Step 4: Commit** (jika git aktif)

```bash
git add messages/
git commit -m "feat(i18n): expand id/en message catalog for redesign"
```

---

### Task 3: Redesign halaman Auth (login + register)

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`
- (Cek/ikuti komponen client jika logika auth ada di file terpisah; jika logic inline di page, ubah di page.)

**Interfaces:**
- Consumes: token Task 1, key `auth.*` & `app.*` Task 2, `signIn`/`signUpCustomer` dari `lib/supabase/actions.ts` (tanda tangan tidak berubah).

- [ ] **Step 1:** Gunakan skill `frontend-design` (atau `ui-ux-pro-max`) untuk mendesain layout auth ber-brand: panel terpusat, logo/wordmark "Locana" dengan Fraunces, ilustrasi/motif kopi halus, kartu form memakai `bg-card`/`border`/`text-foreground`, tombol primary `bg-primary`, link memakai `text-accent`. Mobile-first.
- [ ] **Step 2:** Tulis ulang `app/login/page.tsx` & `app/register/page.tsx` memakai HANYA token & key i18n. Pertahankan pemanggilan server action & penanganan error/toast yang sudah ada. Tidak ada warna mentah, tidak ada teks literal.
- [ ] **Step 3: Audit anti-hardcoded** pada kedua file.

Run:
```bash
grep -nE "stone-|amber-|slate-|gray-|zinc-|#[0-9a-fA-F]{3,6}" app/login/page.tsx app/register/page.tsx || echo "CLEAN"
```
Expected: `CLEAN`

- [ ] **Step 4:** `npx next build` → lulus. Cek visual `/login` & `/register`.
- [ ] **Step 5: Commit** (jika git aktif): `git add app/login app/register && git commit -m "feat(ui): redesign auth pages"`

---

### Task 4: Customer shell + bottom nav

**Files:**
- Modify: `app/(customer)/layout.tsx`
- Modify: `components/customer-nav.tsx`

**Interfaces:**
- Consumes: token Task 1, key `customer.*` (home/rewards/history/settings) Task 2.
- Produces: shell konsisten (header + bottom nav) yang membungkus semua halaman customer.

- [ ] **Step 1:** Desain bottom-nav mobile-first (4 item: Beranda/Rewards/Riwayat/Pengaturan) dengan ikon lucide (`Home`/`QrCode`, `Gift`, `History`, `Settings`), state aktif memakai `text-accent`, inaktif `text-muted-foreground`. Header tipis dengan wordmark Fraunces. Background `bg-background`, nav `bg-card/border`.
- [ ] **Step 2:** Tulis ulang `customer-nav.tsx` & `layout.tsx` memakai token + key i18n. Pakai `usePathname` untuk active state (komponen client jika perlu).
- [ ] **Step 3:** Audit: `grep -nE "stone-|amber-|slate-|gray-|zinc-|#[0-9a-fA-F]{3,6}" app/\(customer\)/layout.tsx components/customer-nav.tsx || echo CLEAN` → `CLEAN`
- [ ] **Step 4:** `npx next build` → lulus.
- [ ] **Step 5: Commit** (jika git aktif): `git commit -m "feat(ui): customer shell + bottom nav"`

---

### Task 5: Customer home (QR + stamp grid)

**Files:**
- Modify: `components/home-client.tsx`
- (Cek `app/(customer)/home/page.tsx` — jaga props server tetap kompatibel.)

**Interfaces:**
- Consumes: props `HomeClientProps` yang sudah ada (`customerId`, `fullName`, `currentStamps`, `rules[]`), token Task 1, key Task 2.

- [ ] **Step 1:** Ganti SEMUA warna hardcoded di `home-client.tsx` (`text-stone-900`, `bg-amber-500`, dll.) dengan token: kartu QR `bg-card`, motif aksen `bg-accent text-accent-foreground`, stamp earned `bg-accent`, stamp kosong `bg-muted text-muted-foreground border-border`, progress pakai `bg-accent`. Heading pakai Fraunces (kelas `font-[family-name:var(--font-heading)]` atau elemen `h1`).
- [ ] **Step 2:** Ganti teks literal: `"Halo, {fullName}!"` → `t('app.greeting', { name: fullName })`; `"Target Reward Cafe"` → `t('customer.cafeRewardTargets')`; `"Stamp"` → `t('customer.stampLabel')`. Pastikan QR tetap di-generate dari `customerId` (UUID) — JANGAN ubah sumber data QR.
- [ ] **Step 3:** Poles visual: QR sebagai hero card dengan bingkai hangat, stamp grid dengan animasi stempel halus, milestone list rapi. Gunakan skill `frontend-design`.
- [ ] **Step 4:** Audit: `grep -nE "stone-|amber-|slate-|gray-|zinc-|#[0-9a-fA-F]{3,6}" components/home-client.tsx || echo CLEAN` → `CLEAN` (kecuali kode warna di opsi `QRCode.toDataURL` yang boleh memakai hex netral hitam/putih untuk kontras QR — itu diizinkan; pastikan komentari alasannya).
- [ ] **Step 5:** `npx next build` → lulus. Cek visual `/home`.
- [ ] **Step 6: Commit** (jika git aktif): `git commit -m "feat(ui): redesign customer home"`

---

### Task 6: Customer rewards + history

**Files:**
- Modify: `app/(customer)/rewards/page.tsx`
- Modify: `app/(customer)/history/page.tsx`
- (Jika ada komponen client terkait, ubah juga.)

**Interfaces:**
- Consumes: data dari Supabase query yang sudah ada di page; token Task 1; key `customer.*` Task 2.

- [ ] **Step 1:** Rewards: tampilkan kartu reward dengan badge status — `available` pakai `bg-success/15 text-success`, `used` pakai `bg-muted text-muted-foreground`. Tanggal pakai `t('customer.rewardEarnedOn',{date})` / `rewardUsedOn`. Empty state pakai `t('customer.noRewards')` + ikon `Gift`.
- [ ] **Step 2:** History: list scan log (action `add_stamp`) sebagai timeline; tampilkan `t('customer.stampEarned',{count})` & tanggal. Empty state `t('customer.historyEmpty')`. Filter hanya tampilkan aksi relevan untuk customer.
- [ ] **Step 3:** Ganti semua warna/teks literal dengan token + key.
- [ ] **Step 4:** Audit grep kedua file → `CLEAN`.
- [ ] **Step 5:** `npx next build` → lulus. Cek visual.
- [ ] **Step 6: Commit** (jika git aktif): `git commit -m "feat(ui): redesign customer rewards + history"`

---

### Task 7: Customer settings (bahasa + edit nama + logout)

**Files:**
- Modify: `components/settings-client.tsx`
- Modify: `lib/supabase/actions.ts` (tambah `updateProfileName`)
- (Cek `app/(customer)/settings/page.tsx` — sudah meneruskan `fullName`, `email`, `initialLocale`, `signOutAction`.)

**Interfaces:**
- Consumes: props `settings-client` saat ini; token Task 1; key Task 2.
- Produces: server action baru:
  ```ts
  export async function updateProfileName(fullName: string):
    Promise<{ success: boolean; error?: string }>
  ```
  (update `profiles.full_name` untuk `auth.uid()` lewat client server biasa — RLS "update own profile" mengizinkan.)

- [ ] **Step 1: Tambah `updateProfileName` di `lib/supabase/actions.ts`**:

```ts
export async function updateProfileName(fullName: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sesi berakhir, silakan login kembali' }
    const trimmed = fullName.trim()
    if (!trimmed) return { success: false, error: 'Nama tidak boleh kosong' }
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Gagal memperbarui nama'
    return { success: false, error: message }
  }
}
```

- [ ] **Step 2:** Di `settings-client.tsx`: section profil (edit nama → panggil `updateProfileName`, toast `customer.nameUpdated`), section bahasa (toggle ID/EN yang men-set cookie `locale` & refresh — pertahankan mekanisme yang sudah ada / `document.cookie` + `router.refresh()`), tombol logout (`signOutAction`). Desain pakai token; label pakai `common.language`/`common.indonesian`/`common.english`/`auth.logout`/`customer.editName`.
- [ ] **Step 3:** Audit grep `components/settings-client.tsx` → `CLEAN`.
- [ ] **Step 4:** `npx next build` → lulus. Cek: ganti bahasa ID→EN mengubah teks seluruh app; edit nama tersimpan (refresh `/home` menampilkan nama baru).
- [ ] **Step 5: Commit** (jika git aktif): `git commit -m "feat(ui): customer settings with name edit + language toggle"`

---

### Task 8: Kasir scan redesign

**Files:**
- Modify: `components/scan-client.tsx`
- (Cek `app/(kasir)/scan/page.tsx` & `app/(kasir)/layout.tsx`.)

**Interfaces:**
- Consumes: `fetchCustomerScanData`, `addStampAction`, `redeemRewardAction` dari `lib/supabase/actions.ts` (tanda tangan tidak berubah); token Task 1; key `kasir.*`.

- [ ] **Step 1:** Desain alur scan jelas: state (idle → scanning → hasil). Kamera `html5-qrcode` di kartu, instruksi `kasir.scanInstruction`. Setelah scan: kartu customer (nama, progress stamp ring/grid, reward aktif). Dua tombol: **Tambah Stamp** (`bg-primary`) & **Redeem Reward** (`bg-accent`, muncul hanya jika ada reward `available`). Tombol "Scan Lagi" reset state.
- [ ] **Step 2:** Feedback: sukses stamp (toast `kasir.stampAdded`, jika reward earned tampilkan perayaan), cooldown (`kasir.cooldownError`), redeem (`kasir.rewardRedeemed`), error kamera (`kasir.cameraError`). Semua via key i18n.
- [ ] **Step 3:** Ganti semua warna/teks literal dengan token + key. Pertahankan logika pemanggilan action & parsing hasil.
- [ ] **Step 4:** Audit grep `components/scan-client.tsx` (+ layout/page kasir) → `CLEAN`.
- [ ] **Step 5:** `npx next build` → lulus.
- [ ] **Step 6: Commit** (jika git aktif): `git commit -m "feat(ui): redesign kasir scan flow"`

---

### Task 9: Owner shell + dashboard + chart

**Files:**
- Modify: `app/(owner)/layout.tsx`
- Modify: `components/owner-sidebar.tsx`
- Modify: `components/dashboard-client.tsx`
- (Cek `app/(owner)/dashboard/page.tsx` untuk props.)

**Interfaces:**
- Consumes: data statistik dari `dashboard/page.tsx`; token Task 1; key `owner.*`; Recharts.

- [ ] **Step 1:** Sidebar owner (desktop) + drawer (mobile) memakai token `bg-sidebar`/`text-sidebar-foreground`, item aktif `bg-sidebar-accent text-sidebar-accent-foreground`. Item: Dashboard, Manajemen Kasir, Aturan Reward, Log Aktivitas. Wordmark Fraunces.
- [ ] **Step 2:** Dashboard: kartu statistik (total customer, scan hari ini, reward ditukar) dengan ikon & angka besar. Chart Recharts (tren mingguan/scan harian) memakai warna `var(--chart-1..5)` (hangat) — set `stroke`/`fill` ke token, bukan hex. Section "Customer Teraktif".
- [ ] **Step 3:** Ganti warna/teks literal dengan token + key i18n.
- [ ] **Step 4:** Audit grep ketiga file (+ layout) → `CLEAN` (untuk Recharts, pastikan warna dirujuk via CSS var `var(--chart-1)` dsb, bukan kelas `amber-*`/hex).
- [ ] **Step 5:** `npx next build` → lulus.
- [ ] **Step 6: Commit** (jika git aktif): `git commit -m "feat(ui): redesign owner shell + dashboard"`

---

### Task 10: Owner management pages (kasir, reward-rules, activity-logs)

**Files:**
- Modify: `components/kasir-management-client.tsx`
- Modify: `components/reward-rules-client.tsx`
- Modify: `components/activity-logs-client.tsx`
- (Cek page masing-masing di `app/(owner)/...`.)

**Interfaces:**
- Consumes: `createCashierAction`, `toggleCashierStatusAction`, `updateCashierNameAction`, `upsertRewardRuleAction` (tanda tangan tidak berubah); token; key `owner.*`/`common.*`.

- [ ] **Step 1: Kasir management** — tabel kasir (nama, email, status, aksi). Form tambah/edit kasir (dialog), badge status `active`/`inactive` (`bg-success/15`/`bg-muted`), tombol aktif/nonaktif. Semua label via key.
- [ ] **Step 2: Reward rules** — tabel/kartu rule (nama, target stamp, deskripsi, aktif). Form CRUD (dialog) memakai `upsertRewardRuleAction`. Switch aktif/nonaktif.
- [ ] **Step 3: Activity logs** — tabel scan_logs dengan filter tanggal & kasir. Badge action berwarna token (`add_stamp` → success, `redeem_reward` → accent, `rejected_cooldown` → destructive). Empty state.
- [ ] **Step 4:** Ganti semua warna/teks literal dengan token + key di ketiga file.
- [ ] **Step 5:** Audit grep ketiga file → `CLEAN`.
- [ ] **Step 6:** `npx next build` → lulus.
- [ ] **Step 7: Commit** (jika git aktif): `git commit -m "feat(ui): redesign owner management pages"`

---

### Task 11: Perbaikan RLS recursion (migrasi baru)

**Files:**
- Create: `supabase/migrations/20260630010000_fix_rls_recursion.sql`

**Interfaces:**
- Produces: helper `public.get_my_role()` & `public.is_owner()` (SECURITY DEFINER, STABLE) dan policy yang dibangun ulang tanpa subquery rekursif ke `profiles`.

- [ ] **Step 1: Tulis migrasi** `supabase/migrations/20260630010000_fix_rls_recursion.sql`:

```sql
-- Fix: RLS infinite recursion on profiles (and policies that subquery profiles).
-- Helpers run as SECURITY DEFINER so they read role without triggering RLS.

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'owner' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role in ('owner','kasir') from public.profiles where id = auth.uid()), false);
$$;

-- PROFILES
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Owners can view all profiles" on public.profiles;
drop policy if exists "Users can update their own profile details" on public.profiles;

create policy "profiles_select_own_or_owner" on public.profiles
  for select using (auth.uid() = id or public.is_owner());
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- LOYALTY PROGRESS
drop policy if exists "Customers can view their own progress" on public.loyalty_progress;
drop policy if exists "Staff (owners, kasir) can view all progress" on public.loyalty_progress;
create policy "progress_select_own_or_staff" on public.loyalty_progress
  for select using (auth.uid() = customer_id or public.is_staff());

-- REWARD RULES
drop policy if exists "Everyone can view active rules" on public.reward_rules;
drop policy if exists "Owners can view all rules" on public.reward_rules;
drop policy if exists "Only Owners can modify rules" on public.reward_rules;
create policy "reward_rules_select" on public.reward_rules
  for select using (is_active = true or public.is_owner());
create policy "reward_rules_modify" on public.reward_rules
  for all using (public.is_owner()) with check (public.is_owner());

-- REWARDS
drop policy if exists "Customers can view their own rewards" on public.rewards;
drop policy if exists "Staff (owners, kasir) can view all rewards" on public.rewards;
create policy "rewards_select_own_or_staff" on public.rewards
  for select using (auth.uid() = customer_id or public.is_staff());

-- SCAN LOGS
drop policy if exists "Owners can view all scan logs" on public.scan_logs;
drop policy if exists "Kasir can view their own scan logs" on public.scan_logs;
drop policy if exists "Customers can view their own scan logs" on public.scan_logs;
create policy "scan_logs_select" on public.scan_logs
  for select using (
    public.is_owner() or auth.uid() = kasir_id or auth.uid() = customer_id
  );
```

- [ ] **Step 2:** Tulis instruksi di README (atau catat untuk user) cara menjalankan migrasi: jalankan isi file ini di Supabase SQL Editor, ATAU `supabase db push` jika CLI tersedia.
- [ ] **Step 3:** (Verifikasi DB live — dilakukan/diawasi user pada Task 12) Setelah dijalankan, query sebagai owner `select * from profiles` tidak lagi error "infinite recursion detected in policy for relation profiles".
- [ ] **Step 4: Commit** (jika git aktif): `git add supabase/migrations && git commit -m "fix(db): resolve RLS recursion via SECURITY DEFINER role helpers"`

---

### Task 12: Verifikasi akhir + README + audit global

**Files:**
- Modify: `README.md` (pastikan langkah setup Supabase, seed owner, env vars, dan menjalankan migrasi RLS-fix akurat)

- [ ] **Step 1: Build bersih**

Run: `npx next build`
Expected: lulus tanpa error/warning baru.

- [ ] **Step 2: Audit global anti-hardcoded** di seluruh `app/` & `components/` (kecuali `components/ui/*` bawaan shadcn yang sudah token-based, dan hex hitam/putih pada generator QR):

Run:
```bash
grep -rnE "(text|bg|border|ring|from|to|via)-(stone|amber|slate|gray|zinc|neutral|orange|red|green|blue)-[0-9]" app components --include=*.tsx | grep -v "components/ui/" || echo "CLEAN"
```
Expected: `CLEAN` (jika ada sisa, perbaiki ke token lalu ulangi).

- [ ] **Step 3: Audit teks literal Indonesia di JSX** (spot-check) — cari string mencurigakan di komponen yang seharusnya pakai `t(...)`:

Run:
```bash
grep -rnE ">[^<>{}/]*[A-Za-z]{4,}[^<>{}]*<" app components --include=*.tsx | grep -viE "t\(|className|import|components/ui/" | head -30
```
Tinjau hasilnya; pindahkan teks tampilan yang masih literal ke key i18n. (Heuristik, bukan absolut.)

- [ ] **Step 4: Verifikasi paritas i18n** (ulang perintah Task 2 Step 3) → `OK: keys match`.

- [ ] **Step 5: Update README** — pastikan berisi: env vars (`.env.local.example`), cara membuat owner pertama (seed/dashboard), urutan menjalankan migrasi termasuk `20260630010000_fix_rls_recursion.sql`.

- [ ] **Step 6: Checklist alur end-to-end** (diawasi user dengan Supabase live, lihat README):
  - register customer → profil & loyalty_progress otomatis dibuat
  - login customer → `/home` tampil QR (UUID) + progress
  - login kasir → scan QR customer → Tambah Stamp → stamp +1
  - capai target rule → reward `available` muncul (customer `/rewards`)
  - scan ulang <5 menit → ditolak cooldown, tercatat di scan_logs
  - kasir Redeem → reward jadi `used`
  - owner: dashboard statistik terisi, log aktivitas tampil, CRUD kasir & reward rule jalan
  - RLS: customer tak bisa lihat data customer lain; kasir tak bisa baca seluruh tabel; tidak ada error recursion
  - toggle ID/EN mengubah seluruh UI

- [ ] **Step 7: Commit** (jika git aktif): `git add -A && git commit -m "docs: finalize README + redesign verification"`

---

## Self-Review (penulis rencana)

**Spec coverage:**
- Design system Cafe Cozy (warna OKLCH + Fraunces) → Task 1 ✓
- Hapus warna hardcoded → audit di tiap task UI + Task 12 ✓
- i18n penuh, tanpa teks literal, toggle berfungsi → Task 2 (katalog), Task 7 (toggle), Task 12 (audit) ✓
- Rombak UI semua role → Task 3 (auth), 4–7 (customer), 8 (kasir), 9–10 (owner) ✓
- Fix RLS recursion → Task 11 ✓
- Verifikasi build + alur end-to-end → Task 12 ✓
- README setup → Task 12 ✓

**Placeholder scan:** Tidak ada "TBD/TODO"; kode konkret diberikan untuk bagian deterministik (globals.css, font, updateProfileName, migrasi SQL, perintah audit). Komponen visual memberi spesifikasi file + token + key + kriteria terima + perintah grep (sesuai sifat redesign di codebase eksisting; detail JSX diserahkan ke skill frontend-design saat eksekusi).

**Type consistency:** `updateProfileName(fullName: string)` dipakai konsisten di Task 7. Helper SQL `get_my_role()/is_owner()/is_staff()` konsisten di Task 11. Action existing dipakai dengan tanda tangan asli (tidak diubah).

**Catatan:** Verifikasi alur DB live butuh kredensial Supabase user — langkah disediakan, eksekusi final diawasi user (sesuai spec §Risiko).
