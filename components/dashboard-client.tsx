'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Users, QrCode, Gift, Coffee, ArrowUpRight } from 'lucide-react'

interface CustomerRow {
  id: string
  full_name: string
  email: string
  created_at: string
  loyalty_progress: {
    current_stamps: number
  } | null
}

interface ChartItem {
  name: string
  stamps: number
  redeems: number
}

interface DashboardClientProps {
  stats: {
    customerCount: number
    scansToday: number
    rewardsRedeemed: number
  }
  customers: CustomerRow[]
  chartData: ChartItem[]
}

export default function DashboardClient({
  stats,
  customers,
  chartData,
}: DashboardClientProps) {
  const t = useTranslations()

  const statCards = [
    {
      label: t('owner.totalCustomers'),
      value: stats.customerCount,
      hint: t('owner.customersRegistered'),
      icon: Users,
    },
    {
      label: t('owner.totalScansToday'),
      value: stats.scansToday,
      hint: t('owner.scansTodayHint'),
      icon: QrCode,
    },
    {
      label: t('owner.totalRewardsRedeemed'),
      value: stats.rewardsRedeemed,
      hint: t('owner.rewardsRedeemedHint'),
      icon: Gift,
    },
  ]

  return (
    <div className="animate-in space-y-8 duration-300 fade-in">
      {/* Title */}
      <div>
        <h1 className="text-3xl tracking-tight text-foreground">{t('owner.dashboard')}</h1>
        <p className="mt-1 text-muted-foreground">{t('owner.dashboardSubtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </CardTitle>
                <Icon className="h-5 w-5 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-foreground">{card.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts & Recent Customers */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weekly Scan Activity */}
        <Card className="border-border shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold text-card-foreground">
              {t('owner.scanActivity7d')}
            </CardTitle>
            <CardDescription>{t('owner.scanActivityDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="h-80 pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderRadius: '12px',
                    borderColor: 'var(--border)',
                    color: 'var(--card-foreground)',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar name={t('owner.actionAddStamp')} dataKey="stamps" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar name={t('owner.actionRedeem')} dataKey="redeems" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Customers */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-card-foreground">
                {t('owner.recentCustomers')}
              </CardTitle>
              <CardDescription>{t('owner.recentCustomersDesc')}</CardDescription>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            {customers.length === 0 ? (
              <div className="flex h-36 items-center justify-center text-xs italic text-muted-foreground">
                {t('owner.noCustomers')}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {customers.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-4 transition-all hover:bg-secondary/40"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-xs font-bold text-foreground">{c.full_name}</span>
                      <span className="mt-0.5 truncate text-[10px] text-muted-foreground">{c.email}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="flex shrink-0 items-center gap-1 border-accent/40 bg-accent/10 text-accent"
                    >
                      <Coffee className="h-3 w-3" />
                      <span>{c.loyalty_progress?.current_stamps || 0} {t('owner.stamps')}</span>
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
