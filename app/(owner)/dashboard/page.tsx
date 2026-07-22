import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/dashboard-client'
import {
  dummyChartData,
  dummyDailyActivity,
  DUMMY_METRICS,
  DUMMY_FREQUENCY,
} from '@/lib/dummy-data'

export default async function DashboardPage() {
  const supabase = await createClient()
  const locale = await getLocale()
  const intlLocale = locale === 'id' ? 'id-ID' : 'en-US'

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  // All reads are independent — run them in parallel.
  const [
    { count: customerCount },
    { count: scansToday },
    { count: rewardsRedeemed },
    { data: customerList },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer'),
    supabase
      .from('scan_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday.toISOString()),
    supabase
      .from('rewards')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'used'),
    supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        created_at,
        loyalty_progress (
          current_stamps
        )
      `)
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // DUMMY DATA — the 7-day chart and the three PDF-style tables below (daily
  // activity, stamp-count frequency, metrics summary) are fed from the 14-day
  // simulation in `skema-update-account-and-data.pdf`, not from Supabase. The
  // chart shows week 2 (days 8-14), the most recent stretch of that period. To
  // go back to live data, restore the scan_logs query + computation blocks from
  // git history.
  const chartData = dummyChartData(intlLocale)
  const dailyActivity = dummyDailyActivity(intlLocale)
  const metrics = DUMMY_METRICS
  const frequency = DUMMY_FREQUENCY

  interface CustomerDbRow {
    id: string
    full_name: string
    email: string
    created_at: string
    loyalty_progress: { current_stamps: number } | Array<{ current_stamps: number }> | null
  }

  const formattedCustomers = ((customerList || []) as unknown as CustomerDbRow[]).map((c) => {
    const progressData = Array.isArray(c.loyalty_progress) ? c.loyalty_progress[0] : c.loyalty_progress
    return {
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      created_at: c.created_at,
      loyalty_progress: progressData ? { current_stamps: progressData.current_stamps } : null,
    }
  })

  return (
    <DashboardClient
      stats={{
        customerCount: customerCount || 0,
        scansToday: scansToday || 0,
        rewardsRedeemed: rewardsRedeemed || 0,
      }}
      customers={formattedCustomers}
      chartData={chartData}
      dailyActivity={dailyActivity}
      metrics={metrics}
      frequency={frequency}
    />
  )
}
