import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, getMyProfile } from '@/lib/supabase/auth'
import HomeClient from '@/components/home-client'

export default async function HomePage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Run independent reads in parallel (profile is request-cached).
  const [profile, { data: progress }, { data: rules }] = await Promise.all([
    getMyProfile(),
    supabase
      .from('loyalty_progress')
      .select('current_stamps')
      .eq('customer_id', user.id)
      .single(),
    supabase
      .from('reward_rules')
      .select('id, name, description, target_stamps')
      .eq('is_active', true)
      .order('target_stamps', { ascending: true }),
  ])

  return (
    <HomeClient
      customerId={user.id}
      fullName={profile?.full_name || 'Customer'}
      currentStamps={progress?.current_stamps || 0}
      rules={rules || []}
    />
  )
}
