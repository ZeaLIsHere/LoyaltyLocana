import { createClient } from '@/lib/supabase/server'
import CustomersClient from '@/components/customers-client'

export default async function CustomersPage() {
  const supabase = await createClient()

  // Fetch all customer profiles with their stamp progress
  const { data: customers } = await supabase
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
    .order('created_at', { ascending: false })

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

  return <CustomersClient customers={formattedCustomers} />
}
