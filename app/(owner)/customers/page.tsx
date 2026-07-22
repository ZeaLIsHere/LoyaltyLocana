import { createClient } from '@/lib/supabase/server'
import CustomersClient from '@/components/customers-client'

export default async function CustomersPage() {
  const supabase = await createClient()

  // Fetch customers + the current reward threshold in parallel.
  const [{ data: customers }, { data: activeRules }] = await Promise.all([
    supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        birth_date,
        created_at,
        loyalty_progress (
          current_stamps
        )
      `)
      .eq('role', 'customer')
      .order('created_at', { ascending: false }),
    supabase
      .from('reward_rules')
      .select('target_stamps')
      .eq('is_active', true),
  ])

  // Reward threshold = highest active reward target (matches the stamp cap in the
  // spend model). Falls back to 10 when no active rule exists.
  const rewardTarget =
    (activeRules ?? []).reduce((max, r) => Math.max(max, r.target_stamps ?? 0), 0) || 10

  interface LoyaltyProgress {
    current_stamps: number
  }

  interface CustomerDbRow {
    id: string
    full_name: string
    email: string
    birth_date: string | null
    created_at: string
    loyalty_progress: LoyaltyProgress | LoyaltyProgress[] | null
  }

  const formattedCustomers = ((customers || []) as unknown as CustomerDbRow[]).map((c) => {
    const progressData = Array.isArray(c.loyalty_progress) ? c.loyalty_progress[0] : c.loyalty_progress
    return {
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      birth_date: c.birth_date,
      created_at: c.created_at,
      current_stamps: progressData ? progressData.current_stamps : 0,
    }
  })

  return <CustomersClient customers={formattedCustomers} rewardTarget={rewardTarget} />
}
