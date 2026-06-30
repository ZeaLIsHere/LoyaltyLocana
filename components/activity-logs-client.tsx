'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, Coffee, ShieldAlert, Award } from 'lucide-react'

interface LogItem {
  id: string
  action: 'add_stamp' | 'redeem_reward' | 'rejected_cooldown'
  details: string | null
  created_at: string
  customer: {
    full_name: string
    email: string
  }
  kasir: {
    full_name: string
  }
}

interface CashierOption {
  id: string
  full_name: string
}

interface ActivityLogsClientProps {
  logs: LogItem[]
  cashiers: CashierOption[]
}

export default function ActivityLogsClient({ logs, cashiers }: ActivityLogsClientProps) {
  const t = useTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeAction = searchParams.get('action') || 'all'
  const activeKasir = searchParams.get('kasirId') || 'all'
  const activeDate = searchParams.get('date') || ''

  const handleFilterChange = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === 'all' || value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/activity-logs?${params.toString()}`)
  }

  const handleResetFilters = () => {
    router.push('/activity-logs')
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-stone-900 dark:text-white tracking-tight">
          {t('owner.activityLogs')}
        </h1>
        <p className="text-stone-500 dark:text-stone-400 mt-1">
          Riwayat audit trail lengkap transaksi scan, stempel, dan penukaran reward.
        </p>
      </div>

      {/* Filter Card */}
      <Card className="border-stone-200/60 shadow-sm dark:border-stone-800 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm">
        <CardContent className="p-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          {/* Action Filter */}
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Aksi</label>
            <Select value={activeAction} onValueChange={(val) => handleFilterChange('action', val)}>
              <SelectTrigger className="bg-white dark:bg-stone-900 focus:ring-amber-500">
                <SelectValue placeholder="Semua Aksi" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-stone-900">
                <SelectItem value="all">Semua Aksi</SelectItem>
                <SelectItem value="add_stamp">Tambah Stamp</SelectItem>
                <SelectItem value="redeem_reward">Redeem Reward</SelectItem>
                <SelectItem value="rejected_cooldown">Ditolak Cooldown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cashier Filter */}
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Kasir</label>
            <Select value={activeKasir} onValueChange={(val) => handleFilterChange('kasirId', val)}>
              <SelectTrigger className="bg-white dark:bg-stone-900 focus:ring-amber-500">
                <SelectValue placeholder="Semua Kasir" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-stone-900">
                <SelectItem value="all">Semua Kasir</SelectItem>
                {cashiers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Filter */}
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tanggal</label>
            <Input
              type="date"
              value={activeDate}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="bg-white dark:bg-stone-900 focus:ring-amber-500"
            />
          </div>

          {/* Reset Button */}
          <Button
            onClick={handleResetFilters}
            variant="outline"
            className="border-stone-200 text-stone-600 font-semibold gap-2 shrink-0 h-10 hover:bg-stone-50"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </Button>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-stone-200/60 shadow-sm dark:border-stone-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-stone-50/50 dark:bg-stone-900/30">
              <TableRow>
                <TableHead className="font-bold text-stone-700 dark:text-stone-300 w-32">Waktu</TableHead>
                <TableHead className="font-bold text-stone-700 dark:text-stone-300">Customer</TableHead>
                <TableHead className="font-bold text-stone-700 dark:text-stone-300">Aksi</TableHead>
                <TableHead className="font-bold text-stone-700 dark:text-stone-300">Detail</TableHead>
                <TableHead className="font-bold text-stone-700 dark:text-stone-300">Kasir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-xs text-stone-400 italic">
                    Tidak ditemukan log aktivitas yang sesuai.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const badgeVariant: 'default' | 'secondary' | 'outline' = 'outline'
                  let badgeClass = ''
                  let ActionIcon = Coffee

                  if (log.action === 'add_stamp') {
                    badgeClass = 'bg-amber-500 text-white'
                    ActionIcon = Coffee
                  } else if (log.action === 'redeem_reward') {
                    badgeClass = 'bg-emerald-500 text-white'
                    ActionIcon = Award
                  } else if (log.action === 'rejected_cooldown') {
                    badgeClass = 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400'
                    ActionIcon = ShieldAlert
                  }

                  return (
                    <TableRow key={log.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/20">
                      <TableCell className="text-stone-400 text-xs font-mono">
                        {new Date(log.created_at).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                            {log.customer?.full_name || 'Customer'}
                          </span>
                          <span className="text-[9px] text-stone-400 truncate">
                            {log.customer?.email || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant} className={`${badgeClass} flex items-center gap-1 w-fit text-[10px]`}>
                          <ActionIcon className="h-3 w-3" />
                          <span>
                            {log.action === 'add_stamp'
                              ? 'Tambah Stamp'
                              : log.action === 'redeem_reward'
                              ? 'Redeem Reward'
                              : 'Cooldown Ditolak'}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-stone-500 text-xs max-w-xs truncate">
                        {log.details || '-'}
                      </TableCell>
                      <TableCell className="text-stone-700 dark:text-stone-300 font-semibold text-xs">
                        {log.kasir?.full_name || 'Kasir'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
