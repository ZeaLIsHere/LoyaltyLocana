import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { Coffee, Award, ShieldAlert, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HistoryLog {
  id: string
  action: 'add_stamp' | 'redeem_reward' | 'rejected_cooldown'
  details: string | null
  created_at: string
  kasir: {
    full_name: string
  } | null
}

export default async function CustomerHistoryPage() {
  const t = await getTranslations()
  const locale = await getLocale()
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createClient()

  const { data: logs } = await supabase
    .from('scan_logs')
    .select(`
      id,
      action,
      details,
      created_at,
      kasir:kasir_id (
        full_name
      )
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  const formattedLogs = ((logs || []) as unknown as HistoryLog[]).map((log) => ({
    ...log,
    kasir: Array.isArray(log.kasir) ? log.kasir[0] : log.kasir,
  }))

  const intlLocale = locale === 'id' ? 'id-ID' : 'en-US'

  return (
    <div className="flex animate-in flex-col gap-6 p-5 duration-300 fade-in">
      <div>
        <h1 className="text-2xl tracking-tight text-foreground">{t('customer.history')}</h1>
        <p className="text-xs text-muted-foreground">{t('customer.historySubtitle')}</p>
      </div>

      {formattedLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="mb-2 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{t('customer.historyEmpty')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('customer.historyEmptyHint')}</p>
        </div>
      ) : (
        <div className="relative ml-4 space-y-6 border-l border-border pl-6">
          {formattedLogs.map((log) => {
            const date = new Date(log.created_at)
            const dateStr = date.toLocaleDateString(intlLocale, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
            const timeStr = date.toLocaleTimeString(intlLocale, {
              hour: '2-digit',
              minute: '2-digit',
            })

            let iconClasses = 'bg-accent/15 text-accent'
            let Icon = Coffee
            let title = t('customer.actionStampTitle')

            if (log.action === 'redeem_reward') {
              iconClasses = 'bg-success/15 text-success'
              Icon = Award
              title = t('customer.actionRedeemTitle')
            } else if (log.action === 'rejected_cooldown') {
              iconClasses = 'bg-destructive/15 text-destructive'
              Icon = ShieldAlert
              title = t('customer.actionRejectedTitle')
            }

            return (
              <div key={log.id} className="relative">
                <div
                  className={cn(
                    'absolute -left-[38px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-background shadow-sm',
                    iconClasses
                  )}
                >
                  <Icon className="h-3 w-3" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">{title}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {dateStr}, {timeStr}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {log.details || t('customer.stampDetailFallback')}
                  </p>

                  {log.kasir && (
                    <span className="text-[9px] text-muted-foreground">
                      {t('customer.servedBy', { name: log.kasir.full_name })}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
