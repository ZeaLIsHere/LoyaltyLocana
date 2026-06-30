import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  const locale = await getLocale()
  const intlLocale = locale === 'id' ? 'id-ID' : 'en-US'

  // 1. Fetch total customer count
  const { count: customerCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'customer')

  // 2. Fetch scans today (where created_at >= start of today local time mapped to UTC)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const { count: scansToday } = await supabase
    .from('scan_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfToday.toISOString())

  // 3. Fetch rewards redeemed count
  const { count: rewardsRedeemed } = await supabase
    .from('rewards')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'used')

  // 4. Fetch list of customers with stamp progress
  const { data: customerList } = await supabase
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
    .limit(10)

  // 5. Fetch past 7 days logs for chart
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const { data: scanLogs } = await supabase
    .from('scan_logs')
    .select('action, created_at')
    .gte('created_at', sevenDaysAgo.toISOString())

  // Format 7 days trend for chart
  const chartData = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toLocaleDateString(intlLocale, { weekday: 'short', day: 'numeric' })
    const startOfDay = new Date(d)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(d)
    endOfDay.setHours(23, 59, 59, 999)

    const stampsCount =
      scanLogs?.filter((log) => {
        const logDate = new Date(log.created_at)
        return log.action === 'add_stamp' && logDate >= startOfDay && logDate <= endOfDay
      }).length || 0

    const redeemsCount =
      scanLogs?.filter((log) => {
        const logDate = new Date(log.created_at)
        return log.action === 'redeem_reward' && logDate >= startOfDay && logDate <= endOfDay
      }).length || 0

    chartData.push({
      name: dateStr,
      stamps: stampsCount,
      redeems: redeemsCount,
    })
  }

  interface CustomerDbRow {
    id: string
    full_name: string
    email: string
    created_at: string
    loyalty_progress: { current_stamps: number } | Array<{ current_stamps: number }> | null
  }

  // Map to clean types
  const formattedCustomers = ((customerList || []) as unknown as CustomerDbRow[]).map((c) => {
    const progressData = Array.isArray(c.loyalty_progress) ? c.loyalty_progress[0] : c.loyalty_progress
    return {
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      created_at: c.created_at,
      loyalty_progress: progressData
        ? { current_stamps: progressData.current_stamps }
        : null,
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
    />
  )
}
