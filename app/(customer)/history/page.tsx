import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Coffee, Award, ShieldAlert, Calendar } from 'lucide-react'

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
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch scan logs for customer
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

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-bold text-stone-900 dark:text-white">
          {t('customer.history')}
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Riwayat penambahan stempel dan penukaran hadiah Anda.
        </p>
      </div>

      {formattedLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="h-10 w-10 text-stone-300 mb-2" />
          <p className="text-sm font-medium text-stone-500">{t('common.noData')}</p>
          <p className="text-xs text-stone-400 mt-1">Scan QR Anda di kasir untuk memulai.</p>
        </div>
      ) : (
        <div className="relative border-l border-stone-200 dark:border-stone-800 ml-4 pl-6 space-y-6">
          {formattedLogs.map((log) => {
            const date = new Date(log.created_at)
            const dateStr = date.toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
            const timeStr = date.toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })

            let iconBg = 'bg-amber-100 text-amber-600 dark:bg-amber-950/50'
            let Icon = Coffee
            let title = 'Mendapat Stempel'

            if (log.action === 'redeem_reward') {
              iconBg = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50'
              Icon = Award
              title = 'Penukaran Reward'
            } else if (log.action === 'rejected_cooldown') {
              iconBg = 'bg-red-100 text-red-600 dark:bg-red-950/50'
              Icon = ShieldAlert
              title = 'Scan Ditolak (Cooldown)'
            }

            return (
              <div key={log.id} className="relative">
                {/* Bullet node icon on the timeline line */}
                <div className={`absolute -left-[38px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-white dark:border-stone-900 shadow-sm ${iconBg}`}>
                  <Icon className="h-3 w-3" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-stone-900 dark:text-white">
                      {title}
                    </span>
                    <span className="text-[10px] text-stone-400 font-medium">
                      {dateStr}, {timeStr}
                    </span>
                  </div>

                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {log.details || 'Stempel berhasil ditambahkan.'}
                  </p>

                  {log.kasir && (
                    <span className="text-[9px] text-stone-400">
                      Dilayani oleh: <span className="font-semibold">{log.kasir.full_name}</span>
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
