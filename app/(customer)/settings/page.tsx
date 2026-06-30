import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from '@/components/settings-client'
import { signOut } from '@/lib/supabase/actions'

export default async function SettingsPage() {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile details
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  // Read current locale cookie
  const cookieStore = await cookies()
  const currentLocale = cookieStore.get('locale')?.value || 'id'

  return (
    <SettingsClient
      fullName={profile?.full_name || 'Customer'}
      email={profile?.email || user.email || ''}
      initialLocale={currentLocale}
      signOutAction={signOut}
    />
  )
}
