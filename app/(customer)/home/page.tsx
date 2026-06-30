import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HomeClient from '@/components/home-client'

export default async function HomePage() {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch customer profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Fetch loyalty progress
  const { data: progress } = await supabase
    .from('loyalty_progress')
    .select('current_stamps')
    .eq('customer_id', user.id)
    .single()

  // Fetch active reward rules
  const { data: rules } = await supabase
    .from('reward_rules')
    .select('id, name, description, target_stamps')
    .eq('is_active', true)
    .order('target_stamps', { ascending: true })

  return (
    <HomeClient
      customerId={user.id}
      fullName={profile?.full_name || 'Customer'}
      currentStamps={progress?.current_stamps || 0}
      rules={rules || []}
    />
  )
}
