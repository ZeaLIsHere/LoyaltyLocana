import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Gift, Award, Calendar, CheckCircle } from 'lucide-react'

interface RewardRow {
  id: string
  status: 'available' | 'used'
  earned_at: string
  used_at: string | null
  reward_rules: {
    name: string
    description: string | null
    target_stamps: number
  } | null
}

export default async function CustomerRewardsPage() {
  const t = await getTranslations()
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch customer's rewards
  const { data: rewards } = await supabase
    .from('rewards')
    .select(`
      id,
      status,
      earned_at,
      used_at,
      reward_rules (
        name,
        description,
        target_stamps
      )
    `)
    .eq('customer_id', user.id)
    .order('earned_at', { ascending: false })

  const formattedRewards = ((rewards || []) as unknown as RewardRow[]).map((r) => {
    const rulesData = Array.isArray(r.reward_rules) ? r.reward_rules[0] : r.reward_rules
    return {
      ...r,
      reward_rules: rulesData || null,
    }
  })

  const availableRewards = formattedRewards.filter((r) => r.status === 'available')
  const usedRewards = formattedRewards.filter((r) => r.status === 'used')

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-bold text-stone-900 dark:text-white">
          {t('customer.rewards')}
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Lihat daftar hadiah yang telah Anda kumpulkan.
        </p>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-stone-100 dark:bg-stone-850 p-1 rounded-xl">
          <TabsTrigger value="available" className="rounded-lg py-2 font-semibold text-xs data-[state=active]:bg-white data-[state=active]:text-amber-600 dark:data-[state=active]:bg-stone-900">
            {t('customer.rewardAvailable')} ({availableRewards.length})
          </TabsTrigger>
          <TabsTrigger value="used" className="rounded-lg py-2 font-semibold text-xs data-[state=active]:bg-white data-[state=active]:text-amber-600 dark:data-[state=active]:bg-stone-900">
            {t('customer.rewardUsed')} ({usedRewards.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-4 flex flex-col gap-3">
          {availableRewards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gift className="h-10 w-10 text-stone-300 mb-2" />
              <p className="text-sm font-medium text-stone-500">{t('customer.noRewards')}</p>
              <p className="text-xs text-stone-400 mt-1">Kumpulkan stamp untuk klaim hadiah!</p>
            </div>
          ) : (
            availableRewards.map((reward) => (
              <Card key={reward.id} className="border-amber-200 bg-amber-50/20 dark:border-amber-950/30 dark:bg-amber-950/10">
                <CardHeader className="flex flex-row items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/50">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-bold text-stone-900 dark:text-white truncate">
                      {reward.reward_rules?.name || 'Free Coffee'}
                    </CardTitle>
                    <CardDescription className="text-[10px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                      {reward.reward_rules?.description || 'Dapatkan hadiah Anda di kasir.'}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0 flex justify-between items-center text-[10px] text-stone-400">
                  <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                    Siap Ditukarkan
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Didapat:{' '}
                    {new Date(reward.earned_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="used" className="mt-4 flex flex-col gap-3">
          {usedRewards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gift className="h-10 w-10 text-stone-300 mb-2" />
              <p className="text-sm font-medium text-stone-500">Belum ada riwayat penukaran</p>
            </div>
          ) : (
            usedRewards.map((reward) => (
              <Card key={reward.id} className="border-stone-200/60 dark:border-stone-850">
                <CardHeader className="flex flex-row items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-bold text-stone-900 dark:text-white truncate">
                      {reward.reward_rules?.name || 'Free Coffee'}
                    </CardTitle>
                    <CardDescription className="text-[10px] text-stone-400 truncate mt-0.5">
                      {reward.reward_rules?.description || 'Telah dinikmati'}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0 flex justify-between items-center text-[10px] text-stone-400">
                  <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                    <CheckCircle className="h-2.5 w-2.5" /> Sudah Digunakan
                  </span>
                  <span>
                    Ditukar:{' '}
                    {reward.used_at
                      ? new Date(reward.used_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : '-'}
                  </span>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
