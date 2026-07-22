'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CalendarDays, BarChart3, ListOrdered } from 'lucide-react'

export interface DailyActivityRow {
  day: number
  dayName: string
  week: 1 | 2
  stamps: number
  note: 'quiet' | 'normal' | 'peak'
}

export interface DashboardMetrics {
  totalRegistered: number
  activeCustomers: number
  week1Stamps: number
  week2Stamps: number
  growthPct: number
  totalStamps: number
  reachedTarget: number
  rewardsRedeemed: number
  rewardTarget: number
}

export interface FrequencyRow {
  stampCount: number
  customerCount: number
}

interface DashboardTablesProps {
  dailyActivity: DailyActivityRow[]
  metrics: DashboardMetrics
  frequency: FrequencyRow[]
}

// Phones get smaller type and tighter cell padding so these tables fit without
// horizontal scrolling; from `sm` up they relax back to the default sizing.
const compactTable =
  'text-xs sm:text-sm [&_td]:px-2 [&_td]:py-2 [&_th]:px-2 sm:[&_td]:px-3 sm:[&_th]:px-3'

export default function DashboardTables({
  dailyActivity,
  metrics,
  frequency,
}: DashboardTablesProps) {
  const t = useTranslations()

  const noteLabel = (note: DailyActivityRow['note']) =>
    note === 'peak'
      ? t('owner.notePeak')
      : note === 'quiet'
        ? t('owner.noteQuiet')
        : t('owner.noteNormal')

  const noteClass = (note: DailyActivityRow['note']) =>
    note === 'peak'
      ? 'text-emerald-600 dark:text-emerald-400'
      : note === 'quiet'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-muted-foreground'

  const growthText =
    (metrics.growthPct >= 0 ? '+' : '') +
    metrics.growthPct +
    '% (' +
    (metrics.growthPct >= 30 ? t('owner.growthMeetsMin') : t('owner.growthBelowMin')) +
    ')'

  const metricRows: { label: string; value: string }[] = [
    { label: t('owner.metricTotalRegistered'), value: t('owner.unitPeople', { count: metrics.totalRegistered }) },
    { label: t('owner.metricActiveCustomers'), value: t('owner.unitPeople', { count: metrics.activeCustomers }) },
    { label: t('owner.metricWeek1Stamps'), value: t('owner.unitStamps', { count: metrics.week1Stamps }) },
    { label: t('owner.metricWeek2Stamps'), value: t('owner.unitStamps', { count: metrics.week2Stamps }) },
    { label: t('owner.metricGrowth'), value: growthText },
    { label: t('owner.metricTotalStamps'), value: t('owner.unitStamps', { count: metrics.totalStamps }) },
    {
      label: t('owner.metricReachedTarget', { target: metrics.rewardTarget }),
      value: t('owner.unitPeople', { count: metrics.reachedTarget }),
    },
    { label: t('owner.metricRewardsRedeemed'), value: t('owner.unitRewards', { count: metrics.rewardsRedeemed }) },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* 1. Daily Stamp Activity (14 days) */}
      <Card className="min-w-0 border-border shadow-sm lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-card-foreground sm:text-base">
            <CalendarDays className="h-4 w-4 shrink-0 text-accent" />
            {t('owner.dailyActivityTitle')}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t('owner.dailyActivityDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table className={compactTable}>
            <TableHeader className="bg-secondary/40">
              <TableRow>
                <TableHead className="font-bold text-foreground">{t('owner.colDay')}</TableHead>
                <TableHead className="font-bold text-foreground">{t('owner.colDayName')}</TableHead>
                <TableHead className="font-bold text-foreground">{t('owner.colWeek')}</TableHead>
                <TableHead className="text-center font-bold text-foreground">{t('owner.colStampCount')}</TableHead>
                <TableHead className="font-bold text-foreground">{t('owner.colNote')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyActivity.map((row) => (
                <TableRow key={row.day}>
                  <TableCell className="text-muted-foreground">{t('owner.dayLabel', { n: row.day })}</TableCell>
                  <TableCell className="font-medium capitalize text-foreground">{row.dayName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.week === 1 ? t('owner.week1') : t('owner.week2')}
                  </TableCell>
                  <TableCell className="text-center font-bold tabular-nums text-foreground">{row.stamps}</TableCell>
                  <TableCell className={`font-medium ${noteClass(row.note)}`}>{noteLabel(row.note)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="font-bold text-foreground">
                  {t('owner.totalDays')}
                </TableCell>
                <TableCell className="text-center font-black tabular-nums text-foreground">
                  {dailyActivity.reduce((sum, r) => sum + r.stamps, 0)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* 3. Stamp-count frequency */}
      <Card className="min-w-0 border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-card-foreground sm:text-base">
            <BarChart3 className="h-4 w-4 shrink-0 text-accent" />
            {t('owner.frequencyTitle')}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t('owner.frequencyDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table className={compactTable}>
            <TableHeader className="bg-secondary/40">
              <TableRow>
                <TableHead className="font-bold text-foreground">{t('owner.colStampAmount')}</TableHead>
                <TableHead className="text-right font-bold text-foreground">{t('owner.colCustomerCount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {frequency.map((row) => (
                <TableRow key={row.stampCount}>
                  <TableCell className="text-foreground">{t('owner.stampUnit', { n: row.stampCount })}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-foreground">
                    {t('owner.peopleUnit', { count: row.customerCount })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 2. Dashboard metrics summary */}
      <Card className="min-w-0 border-border shadow-sm lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-card-foreground sm:text-base">
            <ListOrdered className="h-4 w-4 shrink-0 text-accent" />
            {t('owner.metricsSummaryTitle')}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t('owner.metricsSummaryDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table className={compactTable}>
            <TableHeader className="bg-secondary/40">
              <TableRow>
                <TableHead className="font-bold text-foreground">{t('owner.colMetric')}</TableHead>
                <TableHead className="text-right font-bold text-foreground">{t('owner.colValue')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metricRows.map((row) => (
                <TableRow key={row.label}>
                  {/* Metric names and the growth value are long sentences — let them
                      wrap so this table never needs horizontal scrolling. */}
                  <TableCell className="whitespace-normal text-foreground">{row.label}</TableCell>
                  <TableCell className="whitespace-normal text-right font-semibold tabular-nums text-foreground">
                    {row.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
