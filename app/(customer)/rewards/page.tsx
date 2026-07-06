import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Gift, Coffee, CheckCircle } from 'lucide-react'

interface UsedRewardRow {
  id: string
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

  // Spend model: "available" is computed from the current stamp balance vs the
  // active rules (what the customer can redeem right now), and "used" is the
  // redemption history.
  const [{ data: progress }, { data: rules }, { data: usedRewardsRaw }] = await Promise.all([
    supabase
      .from('loyalty_progress')
      .select('current_stamps')
      .eq('customer_id', user.id)
      .single(),
    supabase
      .from('reward_rules')
      .select('id, name, description, target_stamps')
      .eq('is_active', true)
      .order('target_stamps', { ascending: true }),
    supabase
      .from('rewards')
      .select(`
        id,
        used_at,
        reward_rules (
          name,
          description,
          target_stamps
        )
      `)
      .eq('customer_id', user.id)
      .eq('status', 'used')
      .order('used_at', { ascending: false }),
  ])

  const currentStamps = progress?.current_stamps ?? 0
  const activeRules = rules || []
  const redeemableRules = activeRules.filter((r) => currentStamps >= r.target_stamps)

  const usedRewards = ((usedRewardsRaw || []) as unknown as UsedRewardRow[]).map((r) => {
    const rulesData = Array.isArray(r.reward_rules) ? r.reward_rules[0] : r.reward_rules
    return { id: r.id, used_at: r.used_at, reward_rules: rulesData || null }
  })

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

      {/* Current stamp balance */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-4">
        <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Coffee className="h-4 w-4 text-accent" />
          {t('customer.stampProgress')}
        </span>
        <span className="text-lg font-extrabold text-foreground">
          {currentStamps} <span className="text-xs font-medium text-muted-foreground">{t('customer.stampLabel')}</span>
        </span>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-muted p-1.5">
          <TabsTrigger
            value="available"
            className="rounded-lg py-2.5 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-accent data-[state=active]:shadow-sm"
          >
            {t('customer.rewardAvailable')} ({redeemableRules.length})
          </TabsTrigger>
          <TabsTrigger
            value="used"
            className="rounded-lg py-2.5 text-sm font-semibold data-[state=active]:bg-card data-[state=active]:text-accent data-[state=active]:shadow-sm"
          >
            {t('customer.rewardUsed')} ({usedRewards.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-4 flex flex-col gap-3">
          {redeemableRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gift className="mb-2 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">{t('customer.noRewards')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('customer.noRewardsHint')}</p>
            </div>
          ) : (
            redeemableRules.map((rule) => (
              <Card key={rule.id} className="border-accent/40 bg-accent/5">
                <CardHeader className="flex flex-row items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-sm font-bold text-card-foreground">
                      {rule.name}
                    </CardTitle>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {rule.description || t('customer.redeemAtCashier')}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between px-4 pb-4 pt-0 text-[10px] text-muted-foreground">
                  <span className="rounded-full bg-success/15 px-2 py-0.5 font-medium text-success">
                    {t('customer.readyToRedeem')}
                  </span>
                  <span>{t('customer.stampsOf', { current: rule.target_stamps, target: rule.target_stamps })}</span>
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
