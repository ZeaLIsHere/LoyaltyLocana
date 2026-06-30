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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-stone-900 dark:text-white tracking-tight">
          {t('owner.dashboard')}
        </h1>
        <p className="text-stone-500 dark:text-stone-400 mt-1">
          Pantau performa program loyalty cafe Anda.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-stone-200/60 shadow-sm dark:border-stone-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-stone-500 uppercase tracking-wider dark:text-stone-400">
              {t('owner.totalCustomers')}
            </CardTitle>
            <Users className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-stone-900 dark:text-white">
              {stats.customerCount}
            </div>
            <p className="text-xs text-stone-400 mt-1">Akun customer terdaftar</p>
          </CardContent>
        </Card>

        <Card className="border-stone-200/60 shadow-sm dark:border-stone-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-stone-500 uppercase tracking-wider dark:text-stone-400">
              {t('owner.totalScansToday')}
            </CardTitle>
            <QrCode className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-stone-900 dark:text-white">
              {stats.scansToday}
            </div>
            <p className="text-xs text-stone-400 mt-1">Scan add stamp & redeem hari ini</p>
          </CardContent>
        </Card>

        <Card className="border-stone-200/60 shadow-sm dark:border-stone-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-stone-500 uppercase tracking-wider dark:text-stone-400">
              {t('owner.totalRewardsRedeemed')}
            </CardTitle>
            <Gift className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-stone-900 dark:text-white">
              {stats.rewardsRedeemed}
            </div>
            <p className="text-xs text-stone-400 mt-1">Reward terpakai oleh customer</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Charts & Top Customers */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weekly Scan Activity Chart */}
        <Card className="border-stone-200/60 shadow-sm dark:border-stone-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold text-stone-900 dark:text-white">
              Aktivitas Scan (7 Hari Terakhir)
            </CardTitle>
            <CardDescription>Tren harian untuk stempel dan penukaran reward.</CardDescription>
          </CardHeader>
          <CardContent className="h-80 pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" className="hidden dark:block" />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    borderColor: '#e7e5e4',
                    color: '#1c1917',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar name="Tambah Stamp" dataKey="stamps" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar name="Redeem Reward" dataKey="redeems" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Customer List table */}
        <Card className="border-stone-200/60 shadow-sm dark:border-stone-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-stone-900 dark:text-white">
                Customer Terbaru
              </CardTitle>
              <CardDescription>Daftar customer yang baru bergabung.</CardDescription>
            </div>
            <ArrowUpRight className="h-4 w-4 text-stone-400" />
          </CardHeader>
          <CardContent className="p-0">
            {customers.length === 0 ? (
              <div className="flex h-36 items-center justify-center text-xs text-stone-400 italic">
                Belum ada customer terdaftar.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {customers.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-4 hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-all">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                        {c.full_name}
                      </span>
                      <span className="text-[10px] text-stone-400 truncate mt-0.5">
                        {c.email}
                      </span>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-950/50 dark:bg-amber-950/20 dark:text-amber-400 shrink-0">
                      <Coffee className="h-3 w-3" />
                      <span>{c.loyalty_progress?.current_stamps || 0} Stamp</span>
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
