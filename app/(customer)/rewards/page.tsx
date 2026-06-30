import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Gift, Calendar, CheckCircle } from 'lucide-react'

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
  const locale = await getLocale()
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createClient()

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
    return { ...r, reward_rules: rulesData || null }
  })

  const availableRewards = formattedRewards.filter((r) => r.status === 'available')
  const usedRewards = formattedRewards.filter((r) => r.status === 'used')

  const fmtDate = (value: string) =>
    new Date(value).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
      day: 'numeric',
      month: 'short',
    })

  return (
    <div className="flex animate-in flex-col gap-6 p-5 duration-300 fade-in">
      <div>
        <h1 className="text-2xl tracking-tight text-foreground">{t('customer.rewards')}</h1>
        <p className="text-xs text-muted-foreground">{t('customer.rewardsSubtitle')}</p>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted p-1">
          <TabsTrigger
            value="available"
            className="rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-accent"
          >
            {t('customer.rewardAvailable')} ({availableRewards.length})
          </TabsTrigger>
          <TabsTrigger
            value="used"
            className="rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-accent"
          >
            {t('customer.rewardUsed')} ({usedRewards.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-4 flex flex-col gap-3">
          {availableRewards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gift className="mb-2 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">{t('customer.noRewards')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('customer.noRewardsHint')}</p>
            </div>
          ) : (
            availableRewards.map((reward) => (
              <Card key={reward.id} className="border-accent/40 bg-accent/5">
                <CardHeader className="flex flex-row items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-sm font-bold text-card-foreground">
                      {reward.reward_rules?.name}
                    </CardTitle>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {reward.reward_rules?.description || t('customer.redeemAtCashier')}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between px-4 pb-4 pt-0 text-[10px] text-muted-foreground">
                  <span className="rounded-full bg-success/15 px-2 py-0.5 font-medium text-success">
                    {t('customer.readyToRedeem')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t('customer.rewardEarnedOn', { date: fmtDate(reward.earned_at) })}
                  </span>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="used" className="mt-4 flex flex-col gap-3">
          {usedRewards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gift className="mb-2 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">{t('customer.usedHistoryEmpty')}</p>
            </div>
          ) : (
            usedRewards.map((reward) => (
              <Card key={reward.id} className="border-border">
                <CardHeader className="flex flex-row items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-sm font-bold text-card-foreground">
                      {reward.reward_rules?.name}
                    </CardTitle>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {reward.reward_rules?.description}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between px-4 pb-4 pt-0 text-[10px] text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                    {t('customer.rewardUsed')}
                  </span>
                  <span>
                    {reward.used_at
                      ? t('customer.rewardUsedOn', { date: fmtDate(reward.used_at) })
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
