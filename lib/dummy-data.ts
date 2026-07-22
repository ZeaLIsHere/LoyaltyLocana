/**
 * Data dummy (simulasi) dari `skema-update-account-and-data.pdf`.
 *
 * CATATAN: ini BUKAN data transaksi riil dan tidak tersimpan di Supabase — semua
 * angka di bawah di-hardcode agar tampilan dashboard Owner dan halaman Daftar
 * Customer bisa diuji tanpa menyentuh database.
 *
 * Untuk kembali ke data asli, lihat komentar `DUMMY DATA` di
 * `app/(owner)/dashboard/page.tsx` dan `app/(owner)/customers/page.tsx`.
 *
 * Konsistensi yang dijaga (bagian 5 PDF):
 *   - total stamp aktivitas harian (200) == total stamp distribusi pelanggan (200)
 *   - total pelanggan (108) == jumlah baris DUMMY_CUSTOMERS
 *   - jumlah pelanggan per frekuensi menjumlah ke 108
 */

import type {
  DailyActivityRow,
  DashboardMetrics,
  FrequencyRow,
} from '@/components/dashboard-tables'

/** Reward threshold yang dipakai data simulasi (PDF: "Customer Mencapai 10 Stamp"). */
export const DUMMY_REWARD_TARGET = 10

// ---------------------------------------------------------------------------
// 2. Tabel Aktivitas Stamp Harian (14 Hari)
// ---------------------------------------------------------------------------
// `weekday` 1 = Senin … 7 = Minggu. Nama harinya tidak ikut di-hardcode supaya
// tabel tetap mengikuti locale aktif (ID/EN) — lihat `dummyDailyActivity()`.
const DAILY_ACTIVITY_SOURCE: {
  day: number
  weekday: number
  week: 1 | 2
  stamps: number
  note: DailyActivityRow['note']
}[] = [
  { day: 1, weekday: 1, week: 1, stamps: 4, note: 'quiet' },
  { day: 2, weekday: 2, week: 1, stamps: 6, note: 'normal' },
  { day: 3, weekday: 3, week: 1, stamps: 10, note: 'normal' },
  { day: 4, weekday: 4, week: 1, stamps: 7, note: 'normal' },
  { day: 5, weekday: 5, week: 1, stamps: 9, note: 'normal' },
  { day: 6, weekday: 6, week: 1, stamps: 21, note: 'peak' },
  { day: 7, weekday: 7, week: 1, stamps: 23, note: 'peak' },
  { day: 8, weekday: 1, week: 2, stamps: 6, note: 'quiet' },
  { day: 9, weekday: 2, week: 2, stamps: 11, note: 'normal' },
  { day: 10, weekday: 3, week: 2, stamps: 9, note: 'normal' },
  { day: 11, weekday: 4, week: 2, stamps: 14, note: 'normal' },
  { day: 12, weekday: 5, week: 2, stamps: 12, note: 'normal' },
  { day: 13, weekday: 6, week: 2, stamps: 30, note: 'peak' },
  { day: 14, weekday: 7, week: 2, stamps: 38, note: 'peak' },
]

// 1 Januari 2024 (UTC) jatuh pada hari Senin — dipakai sebagai titik acuan untuk
// menerjemahkan `weekday` menjadi nama hari sesuai locale.
const REFERENCE_MONDAY_UTC = Date.UTC(2024, 0, 1)

const dayName = (weekday: number, intlLocale: string, style: 'long' | 'short') =>
  new Date(REFERENCE_MONDAY_UTC + (weekday - 1) * 86_400_000).toLocaleDateString(intlLocale, {
    weekday: style,
    timeZone: 'UTC',
  })

/** Aktivitas 14 hari dengan nama hari yang sudah dilokalkan. */
export function dummyDailyActivity(intlLocale: string): DailyActivityRow[] {
  return DAILY_ACTIVITY_SOURCE.map(({ weekday, ...row }) => ({
    ...row,
    dayName: dayName(weekday, intlLocale, 'long'),
  }))
}

// Penukaran reward per hari. PDF hanya menyebut total 1 reward ditukar
// ("Reward yang Sudah Ditukar (contoh dashboard) = 1 reward"), jadi satu-satunya
// penukaran ditaruh di hari terakhir agar cocok dengan DUMMY_METRICS.
const REDEEMS_BY_DAY: Record<number, number> = { 14: 1 }

/**
 * Data grafik "Aktivitas Scan (7 Hari Terakhir)" — diambil dari minggu ke-2
 * (Hari 8–14) karena itu bagian terbaru dari periode simulasi. Totalnya 120
 * stamp, sama dengan metrik "Total Stamp Minggu 2".
 */
export function dummyChartData(
  intlLocale: string
): { name: string; stamps: number; redeems: number }[] {
  return DAILY_ACTIVITY_SOURCE.filter((d) => d.week === 2).map((d) => ({
    name: dayName(d.weekday, intlLocale, 'short'),
    stamps: d.stamps,
    redeems: REDEEMS_BY_DAY[d.day] ?? 0,
  }))
}

// ---------------------------------------------------------------------------
// 3. Ringkasan Metrik Dashboard
// ---------------------------------------------------------------------------
export const DUMMY_METRICS: DashboardMetrics = {
  totalRegistered: 108,
  activeCustomers: 108,
  week1Stamps: 80,
  week2Stamps: 120,
  growthPct: 50,
  totalStamps: 200,
  reachedTarget: 5,
  rewardsRedeemed: 1,
  rewardTarget: DUMMY_REWARD_TARGET,
}

// ---------------------------------------------------------------------------
// 3.1 Distribusi Frekuensi Jumlah Stamp
// ---------------------------------------------------------------------------
// Hanya jumlah stamp yang benar-benar ada pemiliknya yang ditampilkan (7, 8, dan
// 9 stamp memang kosong di data simulasi).
export const DUMMY_FREQUENCY: FrequencyRow[] = [
  { stampCount: 1, customerCount: 77 },
  { stampCount: 2, customerCount: 15 },
  { stampCount: 3, customerCount: 5 },
  { stampCount: 4, customerCount: 3 },
  { stampCount: 5, customerCount: 2 },
  { stampCount: 6, customerCount: 1 },
  { stampCount: 10, customerCount: 5 },
]

// ---------------------------------------------------------------------------
// 4. Tabel Distribusi Stamp per Pelanggan (108 Orang)
// ---------------------------------------------------------------------------
// Format ringkas [nama, jumlah stamp] — urutannya mengikuti daftar di PDF.
const CUSTOMER_SOURCE: [string, number][] = [
  ['Tomy Aditya', 1],
  ['Rebecca Theresia Nauli Rajagukguk', 3],
  ['Nessie Sirait', 1],
  ['Rafly Angghara', 1],
  ['Thariq', 3],
  ['Marsha Ayu Yudita', 1],
  ['Khairi Azmi', 1],
  ['Ahmad Rozan', 1],
  ['Ilyas', 1],
  ['Azizah', 1],
  ['Chalista', 2],
  ['Riza Zulfi', 1],
  ['Najwa Ferina', 2],
  ['Nadilla', 1],
  ['Fitriya Syakira Nasution', 1],
  ['Alisya Balqis', 1],
  ['Zalfa Zahira Lubis', 2],
  ['Nazwa Ramadhani', 1],
  ['Dina Safira', 1],
  ['Sapi', 1],
  ['Rizky Fathih', 1],
  ['Jihan Nafisah Nada', 1],
  ['Abigail Rizqani', 1],
  ['Christian', 3],
  ['Naek HG Arios', 1],
  ['Noni Indriyani Sumbayak', 3],
  ['Nabila Ariani Lubis', 1],
  ['Qurrata Aini Zulkifli', 1],
  ['Yudika Parapat', 10],
  ['Cintia Tarigan', 1],
  ['Rahma Syahrani', 2],
  ['Jusia Panjaitan', 1],
  ['Alexandra Aurora', 1],
  ['Reissa Remysaura Br.Rajagukguk', 1],
  ['Risky Zaetri F', 1],
  ['Elisabeth', 2],
  ['Ezra Zovanda Siadari', 1],
  ['Yessi Angelina Sipayung', 1],
  ['Ni Aswika', 5],
  ['Rizky Mardiansyah', 1],
  ['Monica Adelina Saragih', 1],
  ['Rachel Kim', 1],
  ['Aureline Luneth', 1],
  ['Tiffany', 4],
  ['Tiara Aulia Ramadhani', 1],
  ['Reza Okbernius Berutu', 1],
  ['Evi', 1],
  ['Marthinus Christian Predly Ginting', 1],
  ['Agung Lutfi Rajwa Sani', 2],
  ['Ruy Hutabarat', 1],
  ['Suci Rahmadani Siregar', 10],
  ['Novia', 1],
  ['Furqon', 1],
  ['Aura Meyzi Rayuda', 1],
  ['Randani Nabila', 1],
  ['Cynthia Veronika', 1],
  ['Falisha Firyal Hasti', 1],
  ['Nazla Mutia', 1],
  ['Raja Nabiilah Azura', 1],
  ['Akhmad Yaris Baihaqi', 4],
  ['Renata', 2],
  ['Echa Annisa', 1],
  ['Jiha Harahap', 1],
  ['Muhammad Farrel Syauqi', 1],
  ['Annisah Rahma Lubis', 1],
  ['Fayiz Abqary Arfa Firdaus', 1],
  ['Zahra Aulia Suha', 1],
  ['Nabila', 1],
  ['Lia', 1],
  ['Avira', 2],
  ['Casey Madeline', 1],
  ['Kristin', 2],
  ['Silkyanida', 1],
  ['Ester Monika', 1],
  ['Jeny Ruth', 1],
  ['Mellyciano', 2],
  ['Cintya Novi Yanti', 1],
  ['Berliana Renatania Saragih', 1],
  ['Farras', 1],
  ['Novyta Adellya', 1],
  ['Lilis', 10],
  ['Rifki Al Sauqy', 4],
  ['Muhammad Rizky Fadhillah', 1],
  ['Parulian Dwi Reslia Simbolon', 2],
  ['Edric Roland Li', 10],
  ['Widya Saragih', 1],
  ['Salman Al Farisi', 1],
  ['Ester', 1],
  ['Yoanta Damanik', 2],
  ['Nulla Zavira', 2],
  ['Carista', 1],
  ['Alya Debora Panggabean', 1],
  ['Umar', 2],
  ['Yanti', 1],
  ['Willsen Grandy Kurniawan', 1],
  ['Yow', 2],
  ['Erlyn', 5],
  ['Rahel Cantik Hutauruk', 1],
  ['Clarisa Nove Henti Br Tarigan', 1],
  ['Prestisio', 1],
  ['Nadhira', 3],
  ['Nindy Bunga Evelyn', 1],
  ['Sella', 1],
  ['Millen', 10],
  ['M. Ghozi Muzakki', 1],
  ['Lily', 1],
  ['Ririn Lasmarito Pasaribu', 6],
  ['Dewi Fortuna Halim', 1],
]

export interface DummyCustomer {
  id: string
  full_name: string
  email: string
  birth_date: string | null
  created_at: string
  current_stamps: number
}

/**
 * 108 pelanggan simulasi. `id` sengaja diberi prefix `dummy-` agar jelas bahwa
 * baris ini tidak punya padanan di database (detail/edit/hapus dimatikan).
 */
export const DUMMY_CUSTOMERS: DummyCustomer[] = CUSTOMER_SOURCE.map(([name, stamps], i) => ({
  id: `dummy-${i + 1}`,
  full_name: name,
  email: '',
  birth_date: null,
  created_at: '',
  current_stamps: stamps,
}))
