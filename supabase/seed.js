const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Helper function to load env variables from .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('File .env.local tidak ditemukan! Pastikan file tersebut ada di root proyek.')
    process.exit(1)
  }

  const content = fs.readFileSync(envPath, 'utf8')
  const env = {}
  content.split('\n').forEach((line) => {
    const parts = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (parts) {
      const key = parts[1]
      let value = parts[2] || ''
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1)
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1)
      }
      env[key] = value.trim()
    }
  })
  return env
}

const env = loadEnv()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY di .env.local belum diisi!')
  process.exit(1)
}

// Initialize Supabase with service role admin key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const testUsers = [
  {
    email: 'owner@locana.com',
    password: 'password123',
    fullName: 'Owner Cafe',
    role: 'owner'
  },
  {
    email: 'kasir@locana.com',
    password: 'password123',
    fullName: 'Kasir Budi',
    role: 'kasir'
  },
  {
    email: 'customer@locana.com',
    password: 'password123',
    fullName: 'Customer Andi',
    role: 'customer'
  }
]

async function seed() {
  console.log('Memulai pembuatan akun uji coba Locana...')

  for (const user of testUsers) {
    console.log(`\nMendaftarkan ${user.role}: ${user.email}...`)
    
    // Check if user already exists in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    if (existingProfile) {
      console.log(`-> Akun ${user.email} sudah terdaftar di database. Melewati...`)
      continue
    }

    // Create user via Admin API (bypasses rate limits & confirms email automatically)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        role: user.role,
        full_name: user.fullName
      }
    })

    if (authError) {
      console.error(`-> Gagal membuat user auth: ${authError.message}`)
      continue
    }

    const createdUser = authData.user
    console.log(`-> Akun Auth berhasil dibuat dengan ID: ${createdUser.id}`)

    // Profiles trigger (on_auth_user_created) should automatically populate public.profiles table.
    // Let's verify and force update the role in profiles to be absolutely sure RLS policy doesn't restrict it.
    let attempts = 0
    let profileUpdated = false

    while (attempts < 5 && !profileUpdated) {
      // Small sleep to let trigger complete
      await new Promise(resolve => setTimeout(resolve, 500))

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', createdUser.id)
        .maybeSingle()

      if (profile) {
        // Force update the role to ensure it is set correctly in public.profiles
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: user.role })
          .eq('id', createdUser.id)

        if (updateError) {
          console.error(`-> Gagal sinkronisasi role di tabel profiles: ${updateError.message}`)
        } else {
          console.log(`-> Profil sinkronisasi role '${user.role}' berhasil.`)
          profileUpdated = true
        }
      }
      attempts++
    }
  }

  console.log('\n=========================================')
  console.log('PROSES SEEDING SELESAI!')
  console.log('Silakan gunakan detail berikut untuk masuk:')
  console.log('1. Akun Owner   : owner@locana.com  (Sandi: password123)')
  console.log('2. Akun Kasir   : kasir@locana.com  (Sandi: password123)')
  console.log('3. Akun Customer: customer@locana.com (Sandi: password123)')
  console.log('=========================================')
}

seed()
