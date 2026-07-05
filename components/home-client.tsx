'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import QRCode from 'qrcode'
import { Card, CardContent } from '@/components/ui/card'
import { Coffee, Gift, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HomeClientProps {
  customerId: string
  fullName: string
  currentStamps: number
  rules: Array<{
    id: string
    name: string
    description: string | null
    target_stamps: number
  }>
}

export default function HomeClient({
  customerId,
  fullName,
  currentStamps,
  rules,
}: HomeClientProps) {
  const t = useTranslations()
  const [qrUrl, setQrUrl] = useState<string>('')

  useEffect(() => {
    if (customerId) {
      QRCode.toDataURL(customerId, {
        width: 250,
        margin: 2,
        // Neutral black/white is required for QR scan contrast — not a theme color.
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error('Error generating QR Code', err))
    }
  }, [customerId])

  // Spend model: the stamp balance fills up to the highest reward target (the
  // balance cap), so the main card shows progress toward that top reward.
  const mainTarget = rules.length > 0 ? Math.max(...rules.map((r) => r.target_stamps)) : 10
  const mainProgressPercent = Math.min((currentStamps / mainTarget) * 100, 100)

  return (
    <div className="flex flex-col gap-6 p-5">
      {/* Welcome Header */}
      <div className="flex flex-col gap-0.5">
        <h1 className="text-2xl tracking-tight text-foreground">
          {t('app.greeting', { name: fullName })}
        </h1>
        <p className="text-sm text-muted-foreground">{t('customer.qrInstruction')}</p>
      </div>

      {/* QR Code Hero Card */}
      <Card className="overflow-hidden border-border bg-card shadow-md">
        <CardContent className="flex flex-col items-center justify-center gap-4 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-accent">
            <QrCode className="h-4 w-4" />
            <span>{t('customer.myQr')}</span>
          </div>
          <div className="relative flex h-52 w-52 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white p-3 shadow-inner">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrUrl} alt={t('customer.myQr')} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <span className="text-xs text-muted-foreground">{t('common.loading')}</span>
              </div>
            )}
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {customerId}
          </p>
        </CardContent>
      </Card>

      {/* Main Stamp Progress Card */}
      <Card className="border-border bg-card shadow-md">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-card-foreground">
              <Coffee className="h-4 w-4 text-accent" />
              {t('customer.stampProgress')}
            </h2>
            <span className="text-sm font-semibold text-muted-foreground">
              {t('customer.stampsOf', { current: currentStamps, target: mainTarget })}
            </span>
          </div>

          {/* Stamps Visual Grid */}
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: mainTarget }).map((_, index) => {
              const isEarned = index < currentStamps
              return (
                <div
                  key={index}
                  className={cn(
                    'relative aspect-square rounded-full transition-all duration-300',
                    isEarned
                      ? 'bg-card shadow-md shadow-accent/15'
                      : 'bg-muted'
                  )}
                >
                  {/* Dashed ring border (decorative PNG replaces the CSS border) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/border-circle.png"
                    alt=""
                    aria-hidden="true"
                    className={cn(
                      // brightness-0 recolors the pale cream ring to a dark, visible
                      // silhouette on the light theme (dark:invert keeps it visible on dark).
                      'pointer-events-none absolute left-1/2 top-1/2 h-[220%] w-[220%] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain brightness-0 transition-opacity duration-300 dark:brightness-100',
                      isEarned ? 'opacity-60' : 'opacity-30'
                    )}
                  />
                  {/* Cup appears only once the stamp is earned; before that the
                      slot is just the ring + empty circle. */}
                  {isEarned && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/icon.png"
                      alt=""
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[128%] w-[128%] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain"
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${mainProgressPercent}%` }}
              />
            </div>
            <div className="flex justify-end text-[10px] text-muted-foreground">
              <span>{Math.round(mainProgressPercent)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reward Milestones */}
      {rules.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('customer.cafeRewardTargets')}
          </h2>
          <div className="flex flex-col gap-3">
            {rules.map((rule) => {
              const progress = Math.min((currentStamps / rule.target_stamps) * 100, 100)
              return (
                <div
                  key={rule.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-secondary/40 p-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-bold text-foreground">{rule.name}</p>
                      {currentStamps >= rule.target_stamps && (
                        <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[9px] font-semibold text-success">
                          {t('customer.readyToRedeem')}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {rule.description || `${rule.target_stamps} ${t('customer.stampLabel')}`}
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs font-bold text-foreground">
                      {currentStamps}/{rule.target_stamps}
                    </span>
                    <p className="text-[9px] text-muted-foreground">{t('customer.stampLabel')}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
