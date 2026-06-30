import { createClient } from '@/lib/supabase/server'
import RewardRulesClient from '@/components/reward-rules-client'

export default async function RewardRulesPage() {
  const supabase = await createClient()

  // Fetch all reward rules ordered by target stamps
  const { data: rules } = await supabase
    .from('reward_rules')
    .select('*')
    .order('target_stamps', { ascending: true })

  return <RewardRulesClient rules={rules || []} />
}
