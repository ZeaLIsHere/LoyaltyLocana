'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, Coffee, ShieldAlert, Award } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()

  const intlLocale = locale === 'id' ? 'id-ID' : 'en-US'

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

  const actionLabel = (action: LogItem['action']) =>
    action === 'add_stamp'
      ? t('owner.actionAddStamp')
      : action === 'redeem_reward'
        ? t('owner.actionRedeem')
        : t('owner.actionRejected')

  return (
    <div className="animate-in space-y-6 duration-300 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl tracking-tight text-foreground">{t('owner.activityLogs')}</h1>
        <p className="mt-1 text-muted-foreground">{t('owner.activityLogsSubtitle')}</p>
      </div>

      {/* Filter Card */}
      <Card className="border-border shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          {/* Action Filter */}
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('owner.action')}
            </label>
            <Select value={activeAction} onValueChange={(val) => handleFilterChange('action', val)}>
              <SelectTrigger>
                <SelectValue placeholder={t('owner.allActions')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('owner.allActions')}</SelectItem>
                <SelectItem value="add_stamp">{t('owner.actionAddStamp')}</SelectItem>
                <SelectItem value="redeem_reward">{t('owner.actionRedeem')}</SelectItem>
                <SelectItem value="rejected_cooldown">{t('owner.actionRejected')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cashier Filter */}
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('owner.kasirName')}
            </label>
            <Select value={activeKasir} onValueChange={(val) => handleFilterChange('kasirId', val)}>
              <SelectTrigger>
                <SelectValue placeholder={t('owner.allKasir')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('owner.allKasir')}</SelectItem>
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
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('owner.date')}
            </label>
            <Input
              type="date"
              value={activeDate}
              onChange={(e) => handleFilterChange('date', e.target.value)}
            />
          </div>

          {/* Reset Button */}
          <Button onClick={handleResetFilters} variant="outline" className="h-10 shrink-0 gap-2 font-semibold">
            <RotateCcw className="h-4 w-4" />
            <span>{t('owner.reset')}</span>
          </Button>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/40">
              <TableRow>
                <TableHead className="w-32 font-bold text-foreground">{t('owner.time')}</TableHead>
                <TableHead className="font-bold text-foreground">{t('owner.customer')}</TableHead>
                <TableHead className="font-bold text-foreground">{t('owner.action')}</TableHead>
                <TableHead className="font-bold text-foreground">{t('owner.detail')}</TableHead>
                <TableHead className="font-bold text-foreground">{t('owner.kasirName')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-xs italic text-muted-foreground">
                    {t('owner.noLogsMatch')}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  let badgeClass = 'bg-accent/15 text-accent'
                  let ActionIcon = Coffee

                  if (log.action === 'redeem_reward') {
                    badgeClass = 'bg-success/15 text-success'
                    ActionIcon = Award
                  } else if (log.action === 'rejected_cooldown') {
                    badgeClass = 'bg-destructive/15 text-destructive'
                    ActionIcon = ShieldAlert
                  }

                  return (
                    <TableRow key={log.id} className="hover:bg-secondary/40">
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString(intlLocale, {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-xs font-bold text-foreground">
                            {log.customer?.full_name || t('owner.customer')}
                          </span>
                          <span className="truncate text-[9px] text-muted-foreground">
                            {log.customer?.email || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn('flex w-fit items-center gap-1 border-transparent text-[10px]', badgeClass)}
                        >
                          <ActionIcon className="h-3 w-3" />
                          <span>{actionLabel(log.action)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {log.details || '-'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {log.kasir?.full_name || t('owner.kasirName')}
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
