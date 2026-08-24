// Inject data simulasi (stamp, scan, reward) ke 161 customer sesuai
// new-data/Simulasi_Dashboard_Loyalty_161_Customer_11_Reward_Final.docx
//
// - Customer sekarang (108 asli) dipertahankan + ditambah 53 akun filler = 161.
// - Distribusi stamp, pola scan mingguan, dan 11 reward mengikuti file simulasi.
//
// Cara pakai:
//   node supabase/inject_simulasi.js          -> dry run (rencana)
//   node supabase/inject_simulasi.js --run    -> eksekusi

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const RUN = process.argv.includes('--run')
const DEFAULT_PASSWORD = 'password123'
const TARGET_CUSTOMERS = 161
const RULE_10_NAME = 'Locana Coffee'

// Distribusi stamp dari dokumen: {stamps: jumlahCustomer}
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
const TOTAL_STAMPS = DISTRIBUTION.reduce((a, d) => a + d.stamps * d.count, 0) // 750

// Pola scan per hari (getDay(): 1=Senin ... 6=Sabtu, 0=Minggu)
const WEEKLY_SCANS = { 1: 25, 2: 28, 3: 27, 4: 30, 5: 33, 6: 37, 0: 41 }
const REDEEMS_LAST_WEEK = { 1: 0, 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 0: 2 } // total 11, Senin 0

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

function shuffle(arr, rand) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function toSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

// ---------------------------------------------------------------------------
// 1. Pastikan reward rules
// ---------------------------------------------------------------------------
async function ensureRules(ownerId) {
  const { data: rules } = await supabase.from('reward_rules').select('id, name, target_stamps')
  const byName = {}
  for (const r of rules || []) byName[r.name.toLowerCase()] = r
  async function ensureRule(name, description, target) {
    if (byName[name.toLowerCase()]) return byName[name.toLowerCase()]
    const { data, error } = await supabase
      .from('reward_rules')
      .insert({ name, description, target_stamps: target, is_active: true, created_by: ownerId })
      .select().single()
    if (error) throw new Error(`Gagal buat rule ${name}: ${error.message}`)
    return data
  }
  await ensureRule('Ice Shaken Espresso', 'Tukarkan 5 stempel', 5)
  const rule10 = await ensureRule(RULE_10_NAME, 'Tukarkan 10 stempel', 10)
  return rule10
}

// ---------------------------------------------------------------------------
// 2. Tambah akun filler sampai total 161
// ---------------------------------------------------------------------------
async function addFillerCustomers(existingIds, existingNames, usedEmails) {
  const need = TARGET_CUSTOMERS - existingIds.length
  console.log(`Customer sudah ada: ${existingIds.length}, perlu tambah: ${need}`)
  if (need <= 0) return existingIds

  const rand = rng(112233)
  const newIds = []
  let idx = 1
  while (newIds.length < need) {
    const name = `${FIRST_NAMES[(idx * 7) % FIRST_NAMES.length]} ${LAST_NAMES[(idx * 13) % LAST_NAMES.length]}`
    idx++
    const nameKey = name.toLowerCase()
    if (existingNames.has(nameKey)) continue
    let email = toSlug(name) + '@gmail.com'
    let n = 2
    while (usedEmails.has(email.toLowerCase())) {
      email = toSlug(name) + n + '@gmail.com'
      n++
    }
    usedEmails.add(email.toLowerCase())
    existingNames.add(nameKey)

    const { data, error } = await withRetry(() =>
      supabase.auth.admin.createUser({
        email, password: DEFAULT_PASSWORD, email_confirm: true,
        user_metadata: { role: 'customer', full_name: name },
      })
    )
    if (error) {
      console.error(`- Gagal buat ${email}: ${error.message}`)
      continue
    }
    let profile = null
    for (let i = 0; i < 12 && !profile; i++) {
      await sleep(300)
      const { data: p } = await supabase.from('profiles').select('id').eq('id', data.user.id).maybeSingle()
      if (p) profile = p
    }
    if (!profile) {
      console.error(`- Profil ${email} tidak terbentuk`)
      continue
    }
    newIds.push(data.user.id)
    console.log(`- Filler #${newIds.length}: ${name} | ${email}`)
  }
  return [...existingIds, ...newIds]
}

// ---------------------------------------------------------------------------
// 3. Bangun scan logs (750 add_stamp + 11 redeem) sesuai pola
// ---------------------------------------------------------------------------
function buildScanLogs(assignments, kasirId) {
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

  const slotMultiset = []
  slots.forEach((s) => {
    for (let i = 0; i < s.count; i++) slotMultiset.push(s.dayOffset)
  })
  const rand = rng(246813579)
  const shuffledSlots = shuffle(slotMultiset, rand)

  const addLogs = []
  let cursor = 0
  for (const a of assignments) {
    const slotsForCustomer = shuffledSlots.slice(cursor, cursor + a.current_stamps).sort((x, y) => x - y)
    cursor += a.current_stamps
    for (const dayOffset of slotsForCustomer) {
      const day = new Date(Date.now() - dayOffset * 86400000)
      day.setHours(8 + Math.floor(rand() * 13), Math.floor(rand() * 60), Math.floor(rand() * 60), 0)
      addLogs.push({
        customer_id: a.customer_id, kasir_id: kasirId, action: 'add_stamp',
        details: 'Stamp added.', created_at: day.toISOString(),
      })
    }
  }
  if (addLogs.length !== TOTAL_STAMPS) throw new Error(`addLogs ${addLogs.length} != ${TOTAL_STAMPS}`)

  const redeemCustomerIds = assignments.filter((a) => a.current_stamps === 10).map((a) => a.customer_id)
  if (redeemCustomerIds.length !== 11) throw new Error(`Customer di 10 stamp = ${redeemCustomerIds.length}, target 11`)

  const redeemLogs = []
  const redeemTimes = []
  for (let d = 6; d >= 1; d--) {
    const day = new Date(Date.now() - d * 86400000)
    const n = REDEEMS_LAST_WEEK[day.getDay()] || 0
    for (let i = 0; i < n; i++) {
      const t = new Date(day)
      t.setHours(9 + Math.floor(rand() * 11), Math.floor(rand() * 60), Math.floor(rand() * 60), 0)
      redeemTimes.push(t.toISOString())
    }
  }
  if (redeemTimes.length !== 11) throw new Error(`redeemTimes ${redeemTimes.length} != 11`)
  redeemTimes.forEach((time, i) => {
    redeemLogs.push({
      customer_id: redeemCustomerIds[i], kasir_id: kasirId, action: 'redeem_reward',
      details: 'Reward redeemed: ' + RULE_10_NAME, created_at: time,
    })
  })
  return { addLogs, redeemLogs, redeemCustomerIds }
}

async function insertLogs(logs) {
  for (let i = 0; i < logs.length; i += 500) {
    const chunk = logs.slice(i, i + 500)
    await withRetry(() => supabase.from('scan_logs').insert(chunk))
    console.log(`  scan_logs: ${Math.min(i + 500, logs.length)}/${logs.length}`)
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('========== INJECT SIMULASI ==========')
  console.log(`Target: ${TARGET_CUSTOMERS} customer, ${TOTAL_STAMPS} stamp, 11 reward`)

  const { data: owner } = await supabase
    .from('profiles').select('id').eq('role', 'owner').maybeSingle()
  const { data: kasir } = await supabase
    .from('profiles').select('id').eq('role', 'kasir').maybeSingle()
  if (!owner || !kasir) throw new Error('Owner/kasir tidak ditemukan!')
  const rule10 = await ensureRules(owner.id)

  const { data: customers } = await supabase
    .from('profiles').select('id, full_name, email').eq('role', 'customer')
  const existingIds = customers.map((c) => c.id)
  const existingNames = new Set(customers.map((c) => c.full_name.trim().toLowerCase()))
  const usedEmails = new Set(customers.map((c) => c.email.toLowerCase()))

  if (!RUN) {
    console.log(`Dry run: customer sekarang ${existingIds.length} -> akan menjadi ${TARGET_CUSTOMERS} (+${TARGET_CUSTOMERS - existingIds.length} filler)`)
    console.log('Distribusi stamp:', DISTRIBUTION.map((d) => `${d.stamps} stamp x${d.count}`).join(', '))
    console.log('Jalankan dengan flag --run untuk eksekusi.')
    return
  }

  // Tambah filler
  const allIds = await addFillerCustomers(existingIds, existingNames, usedEmails)
  if (allIds.length !== TARGET_CUSTOMERS) {
    console.error(`Total customer ${allIds.length} != ${TARGET_CUSTOMERS}. Batalkan.`)
    process.exit(1)
  }

  // Distribusi stamp (acak-deterministik)
  const rand = rng(987654321)
  const assignmentsList = []
  for (const d of DISTRIBUTION) {
    for (let i = 0; i < d.count; i++) assignmentsList.push(d.stamps)
  }
  const shuffled = shuffle(assignmentsList, rand)
  const assignments = allIds.map((id, i) => ({ customer_id: id, current_stamps: shuffled[i] }))

  console.log('Menulis loyalty_progress...')
  await mapWithConcurrency(assignments, 8, async (a) => {
    await withRetry(() =>
      supabase.from('loyalty_progress').update({ current_stamps: a.current_stamps, updated_at: new Date().toISOString() }).eq('customer_id', a.customer_id)
    )
  })

  // Scan logs
  const { addLogs, redeemLogs, redeemCustomerIds } = buildScanLogs(assignments, kasir.id)
  console.log('Menulis scan_logs...')
  await insertLogs(addLogs)
  await insertLogs(redeemLogs)

  // 11 reward (used)
  console.log('Membuat 11 reward...')
  const rewardRows = redeemLogs.map((log, i) => ({
    customer_id: redeemCustomerIds[i],
    reward_rule_id: rule10.id,
    status: 'used',
    earned_at: log.created_at,
    used_at: log.created_at,
    redeemed_by_kasir_id: kasir.id,
  }))
  await withRetry(() => supabase.from('rewards').insert(rewardRows))

  // Verifikasi
  const { count: customerCount } = await supabase
    .from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer')
  const { data: lp } = await supabase.from('loyalty_progress').select('current_stamps')
  const totalStamps = (lp || []).reduce((a, b) => a + b.current_stamps, 0)
  const { count: usedRewards } = await supabase
    .from('rewards').select('*', { count: 'exact', head: true }).eq('status', 'used')
  const { count: logsCount } = await supabase.from('scan_logs').select('*', { count: 'exact', head: true })
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const { count: scansToday } = await supabase
    .from('scan_logs').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday.toISOString())

  console.log('\n========== HASIL AKHIR ==========')
  console.log('Customer        :', customerCount, '(target 161)')
  console.log('Total stamp     :', totalStamps, '(target 750)')
  console.log('Reward used     :', usedRewards, '(target 11)')
  console.log('Scan hari ini   :', scansToday, '(target 25)')
  console.log('Total scan_logs :', logsCount)
  console.log('==================================')
}

main().catch((e) => {
  console.error('\nGAGAL:', e.message)
  process.exit(1)
})
