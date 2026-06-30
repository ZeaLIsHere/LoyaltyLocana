import { createClient } from '@/lib/supabase/server'
import ActivityLogsClient from '@/components/activity-logs-client'

interface SearchParams {
  date?: string
  action?: string
  kasirId?: string
}

export default async function ActivityLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { date, action, kasirId } = await searchParams
  const supabase = await createClient()

  // 1. Fetch cashiers list for filter dropdown
  const { data: cashiers } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'kasir')

  // 2. Fetch scan logs with filters
  let query = supabase
    .from('scan_logs')
    .select(`
      id,
      action,
      details,
      created_at,
      customer:customer_id (
        full_name,
        email
      ),
      kasir:kasir_id (
        full_name
      )
    `)
    .order('created_at', { ascending: false })

  if (action) {
    query = query.eq('action', action)
  }
  if (kasirId) {
    query = query.eq('kasir_id', kasirId)
  }
  if (date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    query = query.gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString())
  }

  const { data: logs } = await query

  interface DatabaseLog {
    id: string
    action: 'add_stamp' | 'redeem_reward' | 'rejected_cooldown'
    details: string | null
    created_at: string
    customer: { full_name: string; email: string } | Array<{ full_name: string; email: string }> | null
    kasir: { full_name: string } | Array<{ full_name: string }> | null
  }

  // Cast join values into typed array matching client props
  const formattedLogs = ((logs || []) as unknown as DatabaseLog[]).map((log) => ({
    id: log.id,
    action: log.action,
    details: log.details,
    created_at: log.created_at,
    customer: Array.isArray(log.customer) ? log.customer[0] : log.customer,
    kasir: Array.isArray(log.kasir) ? log.kasir[0] : log.kasir,
  }))

  return (
    <ActivityLogsClient
      logs={formattedLogs as unknown as React.ComponentProps<typeof ActivityLogsClient>['logs']}
      cashiers={cashiers || []}
    />
  )
}
