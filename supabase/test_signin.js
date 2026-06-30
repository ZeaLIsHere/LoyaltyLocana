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
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Menguji sign-in menggunakan Anon Client...')
console.log('Supabase URL:', supabaseUrl)
console.log('Anon Key (5 chars):', anonKey ? anonKey.substring(0, 10) + '...' : 'undefined')

const supabase = createClient(supabaseUrl, anonKey)

async function testSignIn() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'owner@locana.com',
    password: 'password123',
  })

  if (error) {
    console.error('\nSign-in Gagal!')
    console.error('Error Message:', error.message)
    console.error('Status Code:', error.status)
  } else {
    console.log('\nSign-in Berhasil!')
    console.log('User ID:', data.user.id)
    console.log('Access Token (JWT) acquired successfully.')
  }
}

testSignIn()
