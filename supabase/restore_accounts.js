// Restore 10 akun customer asli + rename email customer simulasi menjadi format [namalengkap@gmail.com]
//
// Cara pakai:
//   node supabase/restore_accounts.js
//
// Yang dilakukan:
//   1. Membuat ulang 10 akun customer asli (email & nama asli, password default password123,
//      saldo 1 stamp, tanggal daftar asli).
//   2. Mengubah email 161 customer simulasi (customerNNN@locana.com) menjadi
//      namalengkap@gmail.com (nama tetap, huruf kecil, tanpa spasi).

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const DEFAULT_PASSWORD = 'password123'

// 10 akun asli yang sempat tercatat (email, nama, tanggal daftar dari database lama)
const TEN_ACCOUNTS = [
  { email: 'diosadellafortuna@gmail.com', name: 'Dewi Fortuna Halim', created_at: '2026-07-06T00:55:00.590564Z' },
  { email: 'ririnlasmaritoo@gmail.com', name: 'Ririn Lasmarito Pasaribu', created_at: '2026-07-06T13:12:30.048438Z' },
  { email: 'lilynau69@gmail.com', name: 'Lily', created_at: '2026-07-07T14:17:41.978363Z' },
  { email: 'ozi.muzakki@gmail.com', name: 'M. Ghozi Muzakki', created_at: '2026-07-08T02:38:45.881842Z' },
  { email: 'millen.halim@gmail.com', name: 'Millen', created_at: '2026-07-09T11:20:50.808008Z' },
  { email: 'sellaseptaz@gmail.com', name: 'sella', created_at: '2026-07-09T11:27:14.057841Z' },
  { email: 'niindybunga@gmail.com', name: 'Nindy Bunga Evelyn', created_at: '2026-07-09T11:53:37.789623Z' },
  { email: 'nadhirahusna53@gmail.com', name: 'Nadhira', created_at: '2026-07-09T12:05:22.766276Z' },
  { email: 'prestisioss@gmail.com', name: 'prestisio', created_at: '2026-07-09T12:10:40.441912Z' },
  { email: 'clarisanove71892@gmail.com', name: 'clarisa nove henti br tarigan', created_at: '2026-07-09T12:15:37.622543Z' },
]

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

// "Dewi Fortuna Halim" -> "dewifortunahalim"
function toEmailSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

// ---------------------------------------------------------------------------
// Langkah 1: Buat ulang 10 akun asli
// ---------------------------------------------------------------------------
async function restoreTenAccounts() {
  const { data: existing } = await supabase
    .from('profiles').select('email').eq('role', 'customer').in('email', TEN_ACCOUNTS.map((a) => a.email))
  const existingSet = new Set((existing || []).map((e) => e.email))

  let created = 0
  await mapWithConcurrency(TEN_ACCOUNTS, 3, async (acc) => {
    if (existingSet.has(acc.email)) {
      console.log(`- ${acc.email} sudah ada, dilewati.`)
      return
    }
    const { data, error } = await withRetry(() =>
      supabase.auth.admin.createUser({
        email: acc.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'customer', full_name: acc.name },
      })
    )
    if (error) {
      console.error(`- Gagal membuat ${acc.email}: ${error.message}`)
      return
    }
    let profile = null
    for (let i = 0; i < 12 && !profile; i++) {
      await sleep(300)
      const { data: p } = await supabase
        .from('profiles').select('id').eq('id', data.user.id).maybeSingle()
      if (p) profile = p
    }
    if (!profile) {
      console.error(`- Profil ${acc.email} tidak terbentuk`)
      return
    }
    // Saldo 1 stamp (semua customer lama punya 1 stamp) + tanggal daftar asli
    await withRetry(() =>
      supabase.from('loyalty_progress')
        .update({ current_stamps: 1, updated_at: acc.created_at })
        .eq('customer_id', data.user.id)
    )
    await withRetry(() =>
      supabase.from('profiles')
        .update({ created_at: acc.created_at, updated_at: acc.created_at })
        .eq('id', data.user.id)
    )
    console.log(`- ${acc.email} (${acc.name}) dibuat ulang, saldo 1 stamp.`)
    created++
  })
  console.log(`Selesai: ${created} akun asli dibuat ulang.`)
}

// ---------------------------------------------------------------------------
// Langkah 2: Rename email customer simulasi -> namalengkap@gmail.com
// ---------------------------------------------------------------------------
async function renameSimulationEmails() {
  const { data: customers } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'customer')

  const simCustomers = (customers || []).filter((c) => c.email.endsWith('@locana.com'))
  console.log(`Customer simulasi yang akan di-rename email: ${simCustomers.length}`)

  // Kumpulkan email yang sudah dipakai (semua role, termasuk 10 akun asli)
  const usedEmails = new Set((customers || []).map((c) => c.email.toLowerCase()))

  const renamePlan = simCustomers.map((c) => {
    let slug = toEmailSlug(c.full_name) || 'customer'
    let newEmail = `${slug}@gmail.com`
    let n = 2
    while (usedEmails.has(newEmail.toLowerCase())) {
      newEmail = `${slug}${n}@gmail.com`
      n++
    }
    usedEmails.add(newEmail.toLowerCase())
    return { id: c.id, full_name: c.full_name, oldEmail: c.email, newEmail }
  })

  let ok = 0
  await mapWithConcurrency(renamePlan, 4, async (r) => {
    const { error } = await withRetry(() =>
      supabase.auth.admin.updateUserById(r.id, { email: r.newEmail, email_confirm: true })
    )
    if (error) {
      console.error(`- Gagal rename ${r.oldEmail} -> ${r.newEmail}: ${error.message}`)
      return
    }
    const { error: pe } = await supabase
      .from('profiles').update({ email: r.newEmail }).eq('id', r.id)
    if (pe) {
      console.error(`- Gagal update profiles.email ${r.newEmail}: ${pe.message}`)
      return
    }
    ok++
  })
  console.log(`Selesai: ${ok}/${renamePlan.length} email berhasil diubah.`)
}

async function main() {
  console.log('========== RESTORE AKUN ==========')
  console.log('Langkah 1: buat ulang 10 akun asli...')
  await restoreTenAccounts()
  console.log('\nLangkah 2: rename email customer simulasi...')
  await renameSimulationEmails()

  const { data: customers } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('role', 'customer')
    .order('created_at', { ascending: true })
  console.log(`\nTotal customer sekarang: ${customers.length}`)
  console.log('\nContoh 15 akun teratas (tertua):')
  customers.slice(0, 15).forEach((c) => console.log(` - ${c.email} | ${c.full_name}`))
}

main().catch((e) => {
  console.error('\nGAGAL:', e.message)
  process.exit(1)
})
