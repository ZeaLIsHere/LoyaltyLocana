import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSessionUser, getMyProfile } from '@/lib/supabase/auth'
import SettingsClient from '@/components/settings-client'
import { signOut } from '@/lib/supabase/actions'

export default async function SettingsPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  // Profile is request-cached; locale cookie read is local.
  const [profile, cookieStore] = await Promise.all([getMyProfile(), cookies()])
  const currentLocale = cookieStore.get('locale')?.value || 'id'

  return (
    <SettingsClient
      fullName={profile?.full_name || 'Customer'}
      email={profile?.email || user.email || ''}
      birthDate={profile?.birth_date || null}
      initialLocale={currentLocale}
      signOutAction={signOut}
    />
  )
}
