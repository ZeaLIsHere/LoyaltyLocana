// Seed data simulasi dari new-data/Simulasi_Dashboard_Loyalty_161_Customer_11_Reward_Final.docx
//
// Cara pakai:
//   node supabase/seed_simulasi.js            -> TAMBAH 161 customer simulasi (data lama dipertahankan)
//   node supabase/seed_simulasi.js --replace  -> HAPUS semua data customer + log + reward yang ada,
//                                                lalu inject simulasi dari nol (owner/kasir dipertahankan)
//
// Catatan: doc simulasi tidak konsisten soal total stamp (tabel = 750, catatan = 700).
// Script ini mengikuti angka di TABEL (750), karena konsisten dengan 161 customer & 11 reward.
// Pola scan harian mengikuti tabel: Senin 25, Selasa 28, Rabu 27, Kamis 30, Jumat 33, Sabtu 37, Minggu 41.

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const REPLACE = process.argv.includes('--replace')

// ---------------------------------------------------------------------------
// Data simulasi dari dokumen
// ---------------------------------------------------------------------------
// Distribusi customer berdasarkan jumlah stamp: {stamps, jumlahCustomer}
const DISTRIBUTION = [
  { stamps: 1, count: 3 },
  { stamps: 2, count: 11 },
  { stamps: 3, count: 61 },
  { stamps: 4, count: 34 },
  { stamps: 5, count: 10 },
  { stamps: 6, count: 5 },
  { stamps: 7, count: 3 },
  { stamps: 8, count: 12 },
  { stamps: 9, count: 11 },
  { stamps: 10, count: 11 },
]
const TOTAL_CUSTOMERS = DISTRIBUTION.reduce((a, d) => a + d.count, 0) // 161
const TOTAL_STAMPS = DISTRIBUTION.reduce((a, d) => a + d.stamps * d.count, 0) // 750

// Pola scan per hari (key = JS getDay(): 1=Senin ... 6=Sabtu, 0=Minggu)
const WEEKLY_SCANS = { 1: 25, 2: 28, 3: 27, 4: 30, 5: 33, 6: 37, 0: 41 }
const REDEEMS_LAST_WEEK = { 1: 0, 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 0: 2 } // total 11, Senin 0 agar "Scan Hari Ini" = 25

const REWARD_PASSWORD = 'password123'
const RULE_10_NAME = 'Locana Coffee' // rule untuk 11 reward (target 10 stamp)

const FIRST_NAMES = [
  'Budi', 'Sari', 'Andi', 'Rina', 'Dewi', 'Agus', 'Fitri', 'Joko', 'Maya', 'Rizky',
  'Putri', 'Dimas', 'Laras', 'Eko', 'Nadia', 'Fajar', 'Intan', 'Bayu', 'Citra', 'Doni',
  'Ratna', 'Hendra', 'Wulan', 'Yoga', 'Sinta', 'Arif', 'Diana', 'Rudi', 'Melati', 'Bagus',
  'Tika', 'Galih', 'Nina', 'Raka', 'Winda', 'Tono', 'Sri', 'Ilham', 'Putra', 'Ayu',
  'Rian', 'Kartika', 'Dedi', 'Lina', 'Agung', 'Vina', 'Slamet', 'Novi', 'Candra', 'Eka',
]
const LAST_NAMES = [
  'Santoso', 'Wijaya', 'Pratama', 'Saputra', 'Hidayat', 'Nugroho', 'Ramadhan', 'Kurniawan', 'Setiawan', 'Firmansyah',
  'Lestari', 'Utami', 'Anggraini', 'Susanti', 'Wulandari', 'Handayani', 'Purnama', 'Maulana', 'Hakim', 'Siregar',
  'Nasution', 'Manurung', 'Simanjuntak', 'Saragih', 'Tanjung', 'Tambunan', 'Siahaan', 'Ginting', 'Sinaga', 'Silalahi',
  'Nainggolan', 'Pakpahan', 'Situmorang', 'Halim', 'Gunawan', 'Salim', 'Susilo', 'Hartono', 'Yusuf', 'Pradana',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('File .env.local tidak ditemukan!')
    process.exit(1)
  }
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

function rng(seed) {
  // Deterministic PRNG (mulberry32) agar urutan penugasan konsisten
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(arr, rand) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

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
  const results = new Array(items.length)
  let next = 0
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

// ---------------------------------------------------------------------------
// Langkah 1: Pastikan owner & kasir ada
// ---------------------------------------------------------------------------
async function ensureStaff() {
  const { data: owner } = await supabase
    .from('profiles').select('id, email').eq('role', 'owner').maybeSingle()
  const { data: kasir } = await supabase
    .from('profiles').select('id, email').eq('role', 'kasir').maybeSingle()

  async function ensure(role, email, fullName) {
    let profile = role === 'owner' ? owner : kasir
    if (profile) return profile
    const { data, error } = await withRetry(() =>
      supabase.auth.admin.createUser({
        email, password: REWARD_PASSWORD, email_confirm: true,
        user_metadata: { role, full_name: fullName },
      })
    )
    if (error) throw new Error(`Gagal membuat ${role}: ${error.message}`)
    // Tunggu trigger profiles
    for (let i = 0; i < 10; i++) {
      await sleep(500)
      const { data: p } = await supabase
        .from('profiles').select('id, email').eq('id', data.user.id).maybeSingle()
      if (p) return p
    }
    throw new Error(`Profil ${role} tidak terbentuk setelah dibuat`)
  }

  const o = await ensure('owner', 'owner@locana.com', 'Owner Cafe')
  const k = await ensure('kasir', 'kasir@locana.com', 'Kasir Budi')
  console.log(`Staff siap: owner=${o.email}, kasir=${k.email}`)
  return { ownerId: o.id, kasirId: k.id }
}

// ---------------------------------------------------------------------------
// Langkah 2: Pastikan reward rules ada
// ---------------------------------------------------------------------------
async function ensureRules(ownerId) {
  const { data: rules } = await supabase.from('reward_rules').select('id, name, target_stamps')
  const byName = {}
  for (const r of rules || []) byName[r.name.toLowerCase()] = r

  async function ensureRule(name, description, target) {
    const key = name.toLowerCase()
    if (byName[key]) return byName[key]
    const { data, error } = await supabase
      .from('reward_rules')
      .insert({ name, description, target_stamps: target, is_active: true, created_by: ownerId })
      .select()
      .single()
    if (error) throw new Error(`Gagal membuat rule ${name}: ${error.message}`)
    console.log(`Reward rule dibuat: ${name} (${target} stamp)`)
    return data
  }

  const rule5 = await ensureRule('Ice Shaken Espresso', 'Tukarkan 5 stempel', 5)
  const rule10 = await ensureRule(RULE_10_NAME, 'Tukarkan 10 stempel', 10)
  return { rule5, rule10 }
}

// ---------------------------------------------------------------------------
// Langkah 3 (--replace): Hapus data customer lama
// ---------------------------------------------------------------------------
async function wipeCustomers() {
  const { data: customers } = await supabase
    .from('profiles').select('id').eq('role', 'customer')
  if (!customers || customers.length === 0) {
    console.log('Tidak ada customer lama untuk dihapus.')
    return
  }
  console.log(`Menghapus ${customers.length} customer lama (profiles + loyalty_progress + rewards + scan_logs via cascade)...`)
  const { error } = await supabase.from('profiles').delete().eq('role', 'customer')
  if (error) throw new Error(`Gagal hapus profiles: ${error.message}`)

  console.log(`Menghapus ${customers.length} akun auth lama...`)
  await mapWithConcurrency(customers, 4, async (c) => {
    await withRetry(() => supabase.auth.admin.deleteUser(c.id))
  })
  console.log('Data customer lama berhasil dihapus.')
}

// ---------------------------------------------------------------------------
// Langkah 4: Buat 161 customer simulasi
// ---------------------------------------------------------------------------
async function createCustomers() {
  const emails = []
  for (let i = 1; i <= TOTAL_CUSTOMERS; i++) {
    emails.push(`customer${String(i).padStart(3, '0')}@locana.com`)
  }

  const { data: existing } = await supabase
    .from('profiles').select('email').eq('role', 'customer').in('email', emails)
  const existingSet = new Set((existing || []).map((e) => e.email))

  const toCreate = emails.filter((e) => !existingSet.has(e))
  console.log(`Membuat ${toCreate.length} customer simulasi (${existingSet.size} sudah ada, dilewati)...`)

  const createdIds = []
  await mapWithConcurrency(toCreate, 4, async (email) => {
    const idx = parseInt(email.match(/customer(\d+)/)[1], 10)
    const fullName = `${FIRST_NAMES[(idx * 7) % FIRST_NAMES.length]} ${LAST_NAMES[(idx * 13) % LAST_NAMES.length]}`
    const { data, error } = await withRetry(() =>
      supabase.auth.admin.createUser({
        email, password: REWARD_PASSWORD, email_confirm: true,
        user_metadata: { role: 'customer', full_name: fullName },
      })
    )
    if (error) {
      console.error(`Gagal membuat ${email}: ${error.message}`)
      return
    }
    // Tunggu trigger handle_new_user (profiles + loyalty_progress)
    for (let i = 0; i < 12; i++) {
      await sleep(300)
      const { data: p } = await supabase
        .from('profiles').select('id').eq('id', data.user.id).maybeSingle()
      if (p) {
        createdIds.push(data.user.id)
        return
      }
    }
    console.error(`Profil ${email} tidak terbentuk (trigger lambat/gagal)`)
  })

  // Pastikan urutan ids acak-deterministik untuk penugasan stamp
  const rand = rng(20260824)
  return shuffle(createdIds, rand)
}

// ---------------------------------------------------------------------------
// Langkah 5: Backdate created_at & set stamp sesuai distribusi
// ---------------------------------------------------------------------------
async function assignStamps(customerIds) {
  if (customerIds.length !== TOTAL_CUSTOMERS) {
    throw new Error(
      `Jumlah customer ${customerIds.length} tidak cocok dengan target ${TOTAL_CUSTOMERS}. Batalkan.`
    )
  }
  // Bangun daftar penugasan stamp (acak-deterministik)
  const rand = rng(987654321)
  const assignments = []
  for (const d of DISTRIBUTION) {
    for (let i = 0; i < d.count; i++) assignments.push(d.stamps)
  }
  const shuffledAssignments = shuffle(assignments, rand)

  const now = Date.now()
  const updates = customerIds.map((id, i) => {
    const stamps = shuffledAssignments[i]
    const createdDaysAgo = Math.floor(rand() * 30) // 0..29 hari lalu
    const created = new Date(now - createdDaysAgo * 86400000 - Math.floor(rand() * 86400000))
    return {
      customer_id: id,
      current_stamps: stamps,
      updated_at: created.toISOString(),
      profile: { id, created_at: created.toISOString(), updated_at: created.toISOString() },
    }
  })

  console.log('Menulis loyalty_progress (distribusi stamp)...')
  await mapWithConcurrency(updates, 8, async (u) => {
    await withRetry(() =>
      supabase.from('loyalty_progress').update({ current_stamps: u.current_stamps, updated_at: u.updated_at }).eq('customer_id', u.customer_id)
    )
  })

  console.log('Backdate created_at profiles...')
  await mapWithConcurrency(updates, 8, async (u) => {
    await withRetry(() =>
      supabase.from('profiles').update({ created_at: u.profile.created_at, updated_at: u.profile.updated_at }).eq('id', u.profile.id)
    )
  })

  // Perbaiki is_active kalau ada yang false
  await withRetry(() =>
    supabase.from('profiles').update({ is_active: true }).eq('role', 'customer')
  )

  const summary = {}
  updates.forEach((u) => {
    summary[u.current_stamps] = (summary[u.current_stamps] || 0) + 1
  })
  console.log('Distribusi stamp terpasang:', summary)
  return updates
}

// ---------------------------------------------------------------------------
// Langkah 6: Generate scan_logs
// ---------------------------------------------------------------------------
function buildScanLogs(assignments, kasirId) {
  // Slot hari: 28 hari terakhir, pola per hari kerja, dipangkas dari hari tertua
  // hingga total add_stamp = TOTAL_STAMPS (750).
  const slots = []
  for (let d = 27; d >= 0; d--) {
    const day = new Date(Date.now() - d * 86400000)
    slots.push({ dayOffset: d, weekday: day.getDay(), count: WEEKLY_SCANS[day.getDay()] })
  }
  let total = slots.reduce((a, s) => a + s.count, 0)
  for (let i = 0; i < slots.length && total > TOTAL_STAMPS; i++) {
    const s = slots[i]
    const excess = total - TOTAL_STAMPS
    const remove = Math.min(s.count, excess)
    s.count -= remove
    total -= remove
  }
  if (total !== TOTAL_STAMPS) throw new Error(`Total add_stamp ${total} != ${TOTAL_STAMPS}`)

  // Multiset slot: setiap entry = { dayOffset }
  const slotMultiset = []
  slots.forEach((s) => {
    for (let i = 0; i < s.count; i++) slotMultiset.push(s.dayOffset)
  })
  const rand = rng(246813579)
  const shuffledSlots = shuffle(slotMultiset, rand)

  // Setiap customer mendapat tepat balance-nya slot (log add_stamp per stamp)
  const addLogs = []
  let cursor = 0
  for (const a of assignments) {
    const slotsForCustomer = shuffledSlots.slice(cursor, cursor + a.current_stamps).sort((x, y) => x - y)
    cursor += a.current_stamps
    for (const dayOffset of slotsForCustomer) {
      const day = new Date(Date.now() - dayOffset * 86400000)
      const hour = 8 + Math.floor(rand() * 13) // 08:00 - 20:59
      const minute = Math.floor(rand() * 60)
      const second = Math.floor(rand() * 60)
      day.setHours(hour, minute, second, 0)
      addLogs.push({ customer_id: a.customer_id, kasir_id: kasirId, action: 'add_stamp', details: 'Stamp added.', created_at: day.toISOString() })
    }
  }
  if (addLogs.length !== TOTAL_STAMPS) throw new Error(`addLogs ${addLogs.length} != ${TOTAL_STAMPS}`)

  // Log redeem: 11 reward dalam 7 hari terakhir, Senin = 0
  const redeemLogs = []
  const redeemCustomerIds = assignments
    .filter((a) => a.current_stamps === 10)
    .map((a) => a.customer_id)
  if (redeemCustomerIds.length !== 11) {
    throw new Error(`Customer di 10 stamp = ${redeemCustomerIds.length}, target 11`)
  }

  const redeemTimes = []
  for (let d = 6; d >= 1; d--) {
    const day = new Date(Date.now() - d * 86400000)
    const n = REDEEMS_LAST_WEEK[day.getDay()] || 0
    for (let i = 0; i < n; i++) {
      const t = new Date(day)
      const hour = 9 + Math.floor(rand() * 11)
      t.setHours(hour, Math.floor(rand() * 60), Math.floor(rand() * 60), 0)
      redeemTimes.push(t.toISOString())
    }
  }
  if (redeemTimes.length !== 11) throw new Error(`redeemTimes ${redeemTimes.length} != 11`)

  redeemTimes.forEach((time, i) => {
    redeemLogs.push({
      customer_id: redeemCustomerIds[i],
      kasir_id: kasirId,
      action: 'redeem_reward',
      details: 'Reward redeemed: ' + RULE_10_NAME,
      created_at: time,
    })
  })

  return { addLogs, redeemLogs, redeemCustomerIds }
}

async function insertLogs(logs) {
  for (let i = 0; i < logs.length; i += 500) {
    const chunk = logs.slice(i, i + 500)
    await withRetry(() => supabase.from('scan_logs').insert(chunk))
    console.log(`  scan_logs: ${Math.min(i + 500, logs.length)}/${logs.length} diinsert`)
  }
}

// ---------------------------------------------------------------------------
// Langkah 7: Buat 11 reward (status used)
// ---------------------------------------------------------------------------
async function createRewards(redeemLogs, redeemCustomerIds, rule10Id, kasirId) {
  const rows = redeemLogs.map((log, i) => ({
    customer_id: redeemCustomerIds[i],
    reward_rule_id: rule10Id,
    status: 'used',
    earned_at: log.created_at,
    used_at: log.created_at,
    redeemed_by_kasir_id: kasirId,
  }))
  await withRetry(() => supabase.from('rewards').insert(rows))
  console.log(`${rows.length} reward dibuat (status used).`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=============================================')
  console.log('SEED DATA SIMULASI LOCANA')
  console.log(`Mode: ${REPLACE ? 'REPLACE (data lama dihapus)' : 'APPEND (data lama dipertahankan)'}`)
  console.log(`Target: ${TOTAL_CUSTOMERS} customer, ${TOTAL_STAMPS} stamp, 11 reward`)
  if (REPLACE) {
    console.log('PERINGATAN: mode replace menghapus SEMUA customer + loyalty + reward + log!')
  }
  console.log('=============================================')

  const { ownerId, kasirId } = await ensureStaff()
  const { rule10 } = await ensureRules(ownerId)

  if (REPLACE) await wipeCustomers()

  const customerIds = await createCustomers()
  if (customerIds.length < TOTAL_CUSTOMERS) {
    console.error(
      `Hanya ${customerIds.length}/${TOTAL_CUSTOMERS} customer berhasil dibuat. ` +
      'Periksa error di atas (mungkin kena rate limit). Coba jalankan ulang — script idempotent.'
    )
    process.exit(1)
  }

  const assignments = await assignStamps(customerIds)
  const { addLogs, redeemLogs, redeemCustomerIds } = buildScanLogs(assignments, kasirId)

  console.log('Menulis scan_logs...')
  await insertLogs(addLogs)
  await insertLogs(redeemLogs)

  await createRewards(redeemLogs, redeemCustomerIds, rule10.id, kasirId)

  // ---- Verifikasi akhir ----
  const { count: customerCount } = await supabase
    .from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer')
  const { data: lp } = await supabase.from('loyalty_progress').select('current_stamps')
  const totalStamps = (lp || []).reduce((a, b) => a + b.current_stamps, 0)
  const { count: usedRewards } = await supabase
    .from('rewards').select('*', { count: 'exact', head: true }).eq('status', 'used')
  const { count: scanLogsTotal } = await supabase
    .from('scan_logs').select('*', { count: 'exact', head: true })
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const { count: scansToday } = await supabase
    .from('scan_logs').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday.toISOString())

  console.log('\n========== HASIL AKHIR ==========')
  console.log('Customer           :', customerCount, '(target 161)')
  console.log('Total stamp        :', totalStamps, '(target 750)')
  console.log('Reward used        :', usedRewards, '(target 11)')
  console.log('Scan hari ini      :', scansToday, '(target 25, Senin)')
  console.log('Total scan_logs    :', scanLogsTotal)
  console.log('==================================')
}

main().catch((e) => {
  console.error('\nGAGAL:', e.message)
  process.exit(1)
})
