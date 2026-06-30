import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ScanClient from '@/components/scan-client'

export default async function ScanPage() {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch cashier profile role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // double check role just in case
  if (!profile || (profile.role !== 'kasir' && profile.role !== 'owner')) {
    redirect('/login')
  }

  return <ScanClient />
}
