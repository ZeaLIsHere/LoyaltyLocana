const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

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
    if (parts) {
      env[parts[1]] = (parts[2] || '').trim()
    }
  })
  return env
}

const env = loadEnv()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function check() {
  console.log('Memeriksa daftar akun Auth di Supabase...')
  const { data: { users }, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('Gagal mengambil daftar user:', error.message)
    return
  }

  console.log(`Ditemukan ${users.length} user auth:`)
  users.forEach(u => {
    console.log(`- Email: ${u.email} | ID: ${u.id} | Confirmed At: ${u.email_confirmed_at} | Last Sign In: ${u.last_sign_in_at}`)
  })

  console.log('\nMemeriksa data di tabel profiles public...')
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('*')

  if (profError) {
    console.error('Gagal mengambil tabel profiles:', profError.message)
    return
  }

  console.log(`Ditemukan ${profiles.length} profil:`)
  profiles.forEach(p => {
    console.log(`- Email: ${p.email} | Role: ${p.role} | Active: ${p.is_active}`)
  })
}

check()
