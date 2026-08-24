// Hapus 161 user SIMULASI (buatan seed_simulasi.js), sisakan hanya user asli (108).
//
// Identifikasi user simulasi: full_name yang di-generate seed_simulasi.js:
//   FIRST_NAMES[(idx * 7) % 50] + ' ' + LAST_NAMES[(idx * 13) % 40], untuk idx = 1..161
// (email-nya sudah di-rename jadi gmail, jadi tidak bisa dipakai sebagai penanda)
//
// Cara pakai:
//   node supabase/remove_sim_users.js          -> dry run
//   node supabase/remove_sim_users.js --delete -> benar-benar hapus

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const DELETE = process.argv.includes('--delete')

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

// Generate ulang 161 nama simulasi (logika identik dengan seed_simulasi.js)
function generateSimNames() {
  const names = new Set()
  for (let idx = 1; idx <= 161; idx++) {
    const name = `${FIRST_NAMES[(idx * 7) % FIRST_NAMES.length]} ${LAST_NAMES[(idx * 13) % LAST_NAMES.length]}`
    names.add(name)
  }
  return names
}

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

async function main() {
  const simNames = generateSimNames()

  const { data: customers } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'customer')

  const simUsers = (customers || []).filter((c) => simNames.has(c.full_name.trim()))
  const realUsers = (customers || []).filter((c) => !simNames.has(c.full_name.trim()))

  console.log(`Total customer di DB    : ${customers.length}`)
  console.log(`Teridentifikasi SIMULASI: ${simUsers.length}`)
  console.log(`Bukan simulasi (asli)   : ${realUsers.length}`)

  if (!DELETE) {
    console.log('\nDry run — jalankan dengan flag --delete untuk menghapus.')
    if (simUsers.length) {
      console.log('\nContoh user simulasi yang akan dihapus:')
      simUsers.slice(0, 10).forEach((c) => console.log(` - ${c.full_name} | ${c.email}`))
    }
    return
  }

  if (simUsers.length !== 161) {
    console.error(`\nEkspektasi 161 user simulasi, tapi teridentifikasi ${simUsers.length}. Hentikan — periksa logika identifikasi!`)
    process.exit(1)
  }

  console.log(`\nMenghapus ${simUsers.length} user simulasi (profiles + cascade loyalty/rewards/scan_logs)...`)
  const { error } = await supabase.from('profiles').delete().in('id', simUsers.map((c) => c.id))
  if (error) throw new Error(`Gagal hapus profiles: ${error.message}`)

  console.log('Menghapus akun auth simulasi...')
  await mapWithConcurrency(simUsers, 4, async (c) => {
    await withRetry(() => supabase.auth.admin.deleteUser(c.id))
  })

  const { count: remaining } = await supabase
    .from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer')
  console.log(`\nTotal customer tersisa: ${remaining}`)

  const { data: left } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('role', 'customer')
    .order('created_at', { ascending: true })
  console.log('\n10 customer tertua yang tersisa:')
  left.slice(0, 10).forEach((c) => console.log(` - ${c.full_name} | ${c.email}`))
}

main().catch((e) => {
  console.error('\nGAGAL:', e.message)
  process.exit(1)
})
