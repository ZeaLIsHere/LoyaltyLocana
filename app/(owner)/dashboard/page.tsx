import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  const locale = await getLocale()
  const intlLocale = locale === 'id' ? 'id-ID' : 'en-US'

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  // 14-day window: Day 1 = 13 days ago (00:00), Day 14 = today.
  const startOfWindow = new Date(startOfToday)
  startOfWindow.setDate(startOfWindow.getDate() - 13)

  // All reads are independent — run them in parallel.
  const [
    { count: customerCount },
    { count: scansToday },
    { count: rewardsRedeemed },
    { data: customerList },
    { data: scanLogs },
    { data: progressRows },
    { data: activeRules },
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
    supabase
      .from('scan_logs')
      .select('action, created_at')
      .gte('created_at', startOfWindow.toISOString()),
    supabase.from('loyalty_progress').select('current_stamps'),
    supabase.from('reward_rules').select('target_stamps').eq('is_active', true),
  ])

  // Reward threshold = highest active target (matches the spend-model stamp cap).
  const rewardTarget =
    (activeRules ?? []).reduce((max, r) => Math.max(max, r.target_stamps ?? 0), 0) || 10

  // Count add_stamp events that fall on a given calendar day.
  const stampsOnDay = (day: Date) => {
    const start = new Date(day)
    start.setHours(0, 0, 0, 0)
    const end = new Date(day)
    end.setHours(23, 59, 59, 999)
    return (
      scanLogs?.filter((log) => {
        const d = new Date(log.created_at)
        return log.action === 'add_stamp' && d >= start && d <= end
      }).length || 0
    )
  }

  // --- 7-day chart (unchanged behaviour) ---
  const chartData = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toLocaleDateString(intlLocale, { weekday: 'short', day: 'numeric' })
    const startOfDay = new Date(d)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(d)
    endOfDay.setHours(23, 59, 59, 999)

    const stampsCount = stampsOnDay(d)
    const redeemsCount =
      scanLogs?.filter((log) => {
        const logDate = new Date(log.created_at)
        return log.action === 'redeem_reward' && logDate >= startOfDay && logDate <= endOfDay
      }).length || 0

    chartData.push({ name: dateStr, stamps: stampsCount, redeems: redeemsCount })
  }

  // --- 14-day daily activity table ---
  const dailyActivity = []
  let week1Stamps = 0
  let week2Stamps = 0
  for (let i = 0; i < 14; i++) {
    const d = new Date(startOfWindow)
    d.setDate(d.getDate() + i)
    const stamps = stampsOnDay(d)
    const week: 1 | 2 = i < 7 ? 1 : 2
    if (week === 1) week1Stamps += stamps
    else week2Stamps += stamps

    // Note is derived from the stamp count on that day.
    let note: 'quiet' | 'normal' | 'peak'
    if (stamps <= 5) note = 'quiet'
    else if (stamps > 15) note = 'peak'
    else note = 'normal'

    dailyActivity.push({
      day: i + 1,
      dayName: d.toLocaleDateString(intlLocale, { weekday: 'long' }),
      week,
      stamps,
      note,
    })
  }
  const totalStamps = week1Stamps + week2Stamps
  const growthPct =
    week1Stamps > 0
      ? Math.round(((week2Stamps - week1Stamps) / week1Stamps) * 100)
      : week2Stamps > 0
        ? 100
        : 0

  // --- Stamp-count frequency (1..10) + active / reached-target counts ---
  const stamps = (progressRows ?? []).map((r) => r.current_stamps ?? 0)
  const activeCustomers = stamps.filter((s) => s > 0).length
  const reachedTarget = stamps.filter((s) => s >= rewardTarget).length
  const frequency = Array.from({ length: 10 }, (_, idx) => {
    const value = idx + 1
    return { stampCount: value, customerCount: stamps.filter((s) => s === value).length }
  })

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
      metrics={{
        totalRegistered: customerCount || 0,
        activeCustomers,
        week1Stamps,
        week2Stamps,
        growthPct,
        totalStamps,
        reachedTarget,
        rewardsRedeemed: rewardsRedeemed || 0,
        rewardTarget,
      }}
      frequency={frequency}
    />
  )
}
