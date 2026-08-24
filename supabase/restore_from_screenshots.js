// Buat akun customer dari nama-nama di screenshot (new-data) — hasil OCR tesseract + Windows OCR.
//
// Aturan email (sesuai permintaan user):
//   - Nama 2-3 kata  -> 2-3 kata digabung + @gmail.com  (contoh: Dewi Fortuna Halim -> dewifortunahalim@gmail.com)
//   - Nama 1 kata    -> nama + angka acak 2-4 digit + @gmail.com (contoh: Novi -> novi2006@gmail.com)
//   - Skip jika nama/email sudah ada di database (mis. Dewi Fortuna Halim tidak double)
//
// Cara pakai:
//   node supabase/restore_from_screenshots.js          -> dry run (cetak rencana, tidak menulis)
//   node supabase/restore_from_screenshots.js --create -> benar-benar membuat akun

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const CREATE = process.argv.includes('--create')
const DEFAULT_PASSWORD = 'password123'

// ---------------------------------------------------------------------------
// 98 nama hasil OCR (sudah dibersihkan). Urutan: screenshot 1, 2, 3.
// ---------------------------------------------------------------------------
const NAMES = [
  // Screenshot 1 (181516)
  'Rebecca Theresia Nauli Rajagukguk',
  'Nessie Sirait',
  'Rafly Anggara',
  'Thariq',
  'Marsha Ayu Yudita',
  'Khairi Azmi',
  'Ilyas',
  'Ahmad Rozan',
  'Azizah',
  'Chalista',
  'Riza Zulfi',
  'Najwa Ferina',
  'Nadilla',
  'Fitriya Syakira Nasution',
  'Alia Balqis',
  'Zalfa Zahira Lubis',
  'Nazwa Ramadhani',
  'Dina Safira',
  'Sani',
  'Rizky Fathih',
  'Jihan Nafisah Nada',
  'Abil Rizqani',
  'Christian',
  'Naek HG Arios',
  'Noni Indriyani Sumbayak',
  'Nabila Ariani Lubis',
  // Screenshot 2 (181614)
  'Qurrata Aini Zulkifli',
  'Yudika Parapat',
  'Cintia Tarigan',
  'Jusia Panjaitan',
  'Alexandra Aurora',
  'Reissa Remysaura Rajagukguk',
  'Elisabeth',
  'Ezra Zovanda Siadari',
  'Yessi Angelina Sipayung',
  'Ni Aswika',
  'Rizky Mardiansyah',
  'Monica Adelina Saragih',
  'Aureline Luneth',
  'Tiffani',
  'Tiara Aulia Ramadhani',
  'Evi',
  'Marthinus Christian Predly Ginting',
  'Agung Lutfi Rajwa Sani',
  'Suci Rahmadani Siregar',
  'Novia',
  'Aura Meyzi Rayuda',
  'Randani Nabila',
  'Cynthia Veronika',
  'Nazla Mutia',
  'Raja Nabiilah Azura',
  'Akhmad Yaris Baihaqi',
  'Echa Annisa',
  'Jihan Harahap',
  'Muhammad Farrel Syauqi',
  'Annisah Rahma Lubis',
  'Fayiz Abqary Arfa Firdaus',
  'Zahra Aulia Suha',
  'Nabila',
  'Lia',
  'Avira',
  'Casey Madeline',
  'Silkyanida',
  'Ester Monika',
  'Jeny Ruth',
  'Cintya Novi Yanti',
  'Berliana Renatania Saragih',
  'Farras',
  'Rahma Syahrani',
  'Rizki Zaetri',
  'Rachel Kim',
  'Reza Okbernius Berutu',
  'Ruth Hutabarat',
  'Furqon',
  'Falisha Fitri Al Hasti',
  'Renata',
  'Kristin',
  'Meliciano',
  'Ginting',
  // Screenshot 3 (181652)
  'Nova Adella',
  'Lilis',
  'Rifki Al Saufi',
  'Muhammad Rizky Fadhillah',
  'Parulian Dwi Reslia Simbolon',
  'Edric Roland Lie',
  'Winda Saragih',
  'Salman Al Farisi',
  'Ester',
  'Yoanta Damanik',
  'Nayla Zavira',
  'Carista',
  'Alia Debora Panjaitan',
  'Umar',
  'Yanti',
  'Willsen Grand Kurniawan',
  'Yow',
  'Erin',
  'Rahel Cantik Hutauruk',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  const content = fs.readFileSync(envPath, 'utf8')
  const env = {}
  content.split('\n').forEach((line) => {
    const parts = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (parts) env[parts[1]] = (parts[2] || '').trim()
  })
  return env
}

const env = loadEnv()
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function withRetry(fn, attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fn()
      if (!res.error) return res
      if (i === attempts) throw new Error(res.error.message)
    } catch (e) {
      if (i === attempts) throw e
    }
    await sleep(800 * i)
  }
}

async function mapWithConcurrency(items, limit, fn) {
  let next = 0
  const results = new Array(items.length)
  async function worker() {
    while (true) {
      const i = next++
      if (i >= items.length) return
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

function toSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

// Aturan email sesuai permintaan user
function makeEmail(name, rand) {
  // Buang gelar "Br"/"Br." (Batak) agar email tidak kotor
  const words = name.split(/\s+/).filter((w) => !/^br\.?$/i.test(w))
  if (words.length >= 2) {
    const take = words.slice(0, Math.min(3, words.length))
    return toSlug(take.join(' ')) + '@gmail.com'
  }
  // 1 kata -> tambah angka acak 2-4 digit
  const digits = Math.floor(rand() * 9000) + 100 // 100..9999
  return toSlug(words[0]) + digits + '@gmail.com'
}

function rng(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const rand = rng(20260824)

  // Ambil customer yang sudah ada
  const { data: existing } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('role', 'customer')
  const existingByName = new Set((existing || []).map((c) => c.full_name.trim().toLowerCase()))
  const usedEmails = new Set((existing || []).map((c) => c.email.toLowerCase()))

  const plan = []
  for (const name of NAMES) {
    const key = name.trim().toLowerCase()
    if (existingByName.has(key)) {
      console.log(`- SKIP (nama sudah ada): ${name}`)
      continue
    }
    let email = makeEmail(name, rand)
    let n = 2
    while (usedEmails.has(email.toLowerCase())) {
      email = makeEmail(name, rand)
      n++
      if (n > 20) {
        // fallback: tambah angka kecil di depan @
        email = toSlug(name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()) + (Math.floor(rand() * 90) + 10) + '@gmail.com'
      }
    }
    usedEmails.add(email.toLowerCase())
    plan.push({ name: name.trim(), email })
  }

  console.log(`\nRencana: ${plan.length} akun baru akan dibuat (${NAMES.length} nama di screenshot, sisanya sudah ada).\n`)

  if (!CREATE) {
    // Dry run: tampilkan email yang akan dibuat
    for (const p of plan) console.log(`  ${p.email}  <-  ${p.name}`)
    console.log(`\nJalankan dengan flag --create untuk benar-benar membuat akun.`)
    return
  }

  console.log(`Membuat ${plan.length} akun...`)
  let ok = 0
  await mapWithConcurrency(plan, 4, async (p) => {
    const { data, error } = await withRetry(() =>
      supabase.auth.admin.createUser({
        email: p.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'customer', full_name: p.name },
      })
    )
    if (error) {
      console.error(`- Gagal ${p.email} (${p.name}): ${error.message}`)
      return
    }
    // Tunggu trigger handle_new_user
    let profile = null
    for (let i = 0; i < 12 && !profile; i++) {
      await sleep(300)
      const { data: pr } = await supabase
        .from('profiles').select('id').eq('id', data.user.id).maybeSingle()
      if (pr) profile = pr
    }
    if (!profile) {
      console.error(`- Profil ${p.email} tidak terbentuk`)
      return
    }
    // Saldo 1 stamp (semua customer lama punya 1 stamp) + backdate ke era screenshot (Juli-Agustus 2026)
    const backdate = new Date(
      Date.UTC(2026, 6, 6 + Math.floor(rand() * 32), 0, 0, 0) // 6 Juli - 6 Agustus 2026
    ).toISOString()
    await withRetry(() =>
      supabase.from('loyalty_progress')
        .update({ current_stamps: 1, updated_at: backdate })
        .eq('customer_id', data.user.id)
    )
    await withRetry(() =>
      supabase.from('profiles')
        .update({ created_at: backdate, updated_at: backdate })
        .eq('id', data.user.id)
    )
    ok++
  })
  console.log(`\nSelesai: ${ok}/${plan.length} akun berhasil dibuat.`)

  const { count: total } = await supabase
    .from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer')
  console.log(`Total customer sekarang: ${total}`)
}

main().catch((e) => {
  console.error('\nGAGAL:', e.message)
  process.exit(1)
})
