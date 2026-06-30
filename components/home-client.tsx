'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import QRCode from 'qrcode'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Coffee, Award, QrCode } from 'lucide-react'
import { Progress as UIProgress } from '@/components/ui/progress'

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
        color: {
          dark: '#1c1917', // stone-900
          light: '#ffffff',
        },
      })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error('Error generating QR Code', err))
    }
  }, [customerId])

  // Find the rule with the lowest target stamps to display as the main progress
  const mainRule = rules.length > 0 ? rules[0] : null
  const mainTarget = mainRule ? mainRule.target_stamps : 10
  const mainProgressPercent = Math.min((currentStamps / mainTarget) * 100, 100)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-stone-900 dark:text-white">
          Halo, {fullName}!
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {t('app.tagline')}
        </p>
      </div>

      {/* QR Code Card */}
      <Card className="overflow-hidden border-stone-200/60 shadow-md dark:border-stone-800 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm">
        <CardHeader className="items-center pb-2 text-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
            <QrCode className="h-4 w-4" />
            <span>{t('customer.myQr')}</span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <div className="relative flex h-52 w-52 items-center justify-center overflow-hidden rounded-2xl border border-stone-100 bg-white p-2 shadow-inner dark:border-stone-800">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt="Customer QR Code"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-stone-50 dark:bg-stone-900">
                <span className="text-xs text-stone-400">{t('common.loading')}</span>
              </div>
            )}
          </div>
          <p className="mt-4 text-[10px] tracking-widest text-stone-400 uppercase font-mono">
            {customerId}
          </p>
        </CardContent>
      </Card>

      {/* Main Stamp Progress Card */}
      <Card className="border-stone-200/60 shadow-md dark:border-stone-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Coffee className="h-4 w-4 text-amber-500" />
            {t('customer.stampProgress')}
          </CardTitle>
          <CardDescription>
            {t('customer.stampsOf', { current: currentStamps, target: mainTarget })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stamps Visual Grid */}
          <div className="grid grid-cols-5 gap-2 pt-2">
            {Array.from({ length: mainTarget }).map((_, index) => {
              const isEarned = index < currentStamps
              return (
                <div
                  key={index}
                  className={`flex aspect-square items-center justify-center rounded-full border text-xs font-bold transition-all duration-300 ${
                    isEarned
                      ? 'border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/20 scale-105'
                      : 'border-stone-200 bg-stone-50 text-stone-300 dark:border-stone-800 dark:bg-stone-900'
                  }`}
                >
                  <Coffee className={`h-4 w-4 ${isEarned ? 'animate-pulse' : ''}`} />
                </div>
              )
            })}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1 pt-2">
            <UIProgress value={mainProgressPercent} className="h-2 bg-stone-100 dark:bg-stone-800" />
            <div className="flex justify-between text-[10px] text-stone-400">
              <span>0%</span>
              <span>{Math.round(mainProgressPercent)}%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Rules & Rewards Milestones */}
      {rules.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
            Target Reward Cafe
          </h2>
          <div className="flex flex-col gap-3">
            {rules.map((rule) => {
              const progress = Math.min((currentStamps / rule.target_stamps) * 100, 100)
              return (
                <div
                  key={rule.id}
                  className="flex items-center gap-4 rounded-xl border border-stone-100 bg-stone-50/50 p-3 dark:border-stone-800 dark:bg-stone-900/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-stone-900 dark:text-white truncate">
                      {rule.name}
                    </p>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                      {rule.description || `${rule.target_stamps} Stamp`}
                    </p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs font-bold text-stone-900 dark:text-white">
                      {currentStamps}/{rule.target_stamps}
                    </span>
                    <p className="text-[9px] text-stone-400">Stamp</p>
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
