import { redirect } from 'next/navigation'
import { getMyProfile } from '@/lib/supabase/auth'
import ScanClient from '@/components/scan-client'

export default async function ScanPage() {
  // Request-cached: reuses the profile already fetched by the kasir layout.
  const profile = await getMyProfile()

  if (!profile || (profile.role !== 'kasir' && profile.role !== 'owner')) {
    redirect('/login')
  }

  return <ScanClient />
}
