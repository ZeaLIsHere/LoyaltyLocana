'use client'

import { useEffect, useRef, useState, useTransition, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Html5Qrcode } from 'html5-qrcode'
import { toast } from 'sonner'
import { addStampAction, fetchCustomerScanData, redeemRewardAction } from '@/lib/supabase/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, RefreshCw, UserCheck, Gift } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RewardRuleInfo {
  name: string
  description: string | null
  target_stamps: number
}

interface RewardItem {
  id: string
  status: string
  earned_at: string
  reward_rules: RewardRuleInfo | null
}

interface CustomerData {
  id: string
  fullName: string
  email: string
  currentStamps: number
  rewards: RewardItem[]
}

export default function ScanClient() {
  const t = useTranslations()
  const [customerData, setCustomerData] = useState<CustomerData | null>(null)
  const [scannerActive, setScannerActive] = useState<boolean>(true)
  const [isPending, startTransition] = useTransition()
  const [loadingCustomer, setLoadingCustomer] = useState<boolean>(false)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannedRef = useRef(false)
  const scannerId = 'qr-reader'

  const loadCustomerData = useCallback(async (customerId: string) => {
    setLoadingCustomer(true)
    const result = await fetchCustomerScanData(customerId)
    setLoadingCustomer(false)

    if (!result.success || !result.customer) {
      toast.error(result.error || t('kasir.customerNotFound'))
      setScannerActive(true)
      return
    }

    setCustomerData(result.customer as CustomerData)
    toast.success(t('kasir.scanSuccess'))
  }, [t])

  useEffect(() => {
    if (!scannerActive) return

    scannedRef.current = false
    const html5QrCode = new Html5Qrcode(scannerId)
    scannerRef.current = html5QrCode

    // start() is an async state transition. Keep its promise so cleanup can
    // wait for it to settle before calling stop() — this is what prevents the
    // "Cannot transition to a new state, already under transition" error
    // (triggered by StrictMode's double-mount and by stopping mid-scan).
    const startPromise = html5QrCode
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7
            return { width: size, height: size }
          },
        },
        (decodedText) => {
          // Only the first successful decode should trigger a load.
          if (scannedRef.current) return
          scannedRef.current = true
          // Do NOT stop() here (we'd be inside an active transition). Flipping
          // state runs this effect's cleanup, which stops safely once start()
          // has settled.
          setScannerActive(false)
          loadCustomerData(decodedText)
        },
        () => {
          // Ignore continuous per-frame scan errors during detection.
        }
      )
      .catch((err) => {
        console.error('Error starting scanner:', err)
        toast.error(t('kasir.cameraError'))
      })

    return () => {
      // Wait for start() to finish its transition, then stop safely.
      startPromise.finally(() => {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().catch((err) => console.error('Error stopping scanner:', err))
        }
      })
    }
  }, [scannerActive, loadCustomerData, t])

  const handleAddStamp = () => {
    if (!customerData) return

    startTransition(async () => {
      const result = await addStampAction(customerData.id)

      if (!result.success) {
        toast.error(result.error || t('kasir.cooldownError'))
        return
      }

      toast.success(result.message || t('kasir.stampAdded'))

      if (result.rewardEarned) {
        toast.success(t('kasir.rewardEarnedNamed', { name: result.rewardName }), {
          duration: 5000,
          icon: <Gift className="h-5 w-5" />,
        })
      }

      loadCustomerData(customerData.id)
    })
  }

  const handleRedeemReward = (rewardId: string) => {
    if (!customerData) return

    startTransition(async () => {
      const result = await redeemRewardAction(rewardId)

      if (!result.success) {
        toast.error(result.error || t('common.error'))
        return
      }

      toast.success(t('kasir.rewardRedeemed'))
      loadCustomerData(customerData.id)
    })
  }

  const handleRescan = () => {
    scannedRef.current = false
    setCustomerData(null)
    setScannerActive(true)
  }

  return (
    <div className="flex flex-col gap-6 p-5">
      {/* Title */}
      <div className="flex flex-col gap-0.5">
        <h1 className="text-2xl tracking-tight text-foreground">{t('kasir.scanTitle')}</h1>
        <p className="text-xs text-muted-foreground">{t('kasir.scanInstruction')}</p>
      </div>

      {/* Scanner Element */}
      {scannerActive && (
        <Card className="overflow-hidden border-border shadow-md">
          <CardContent className="relative flex flex-col items-center justify-center bg-foreground p-6 text-background">
            <div id={scannerId} className="aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-black" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-48 animate-pulse rounded-2xl border-2 border-dashed border-accent" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Camera className="h-4 w-4 text-accent" />
              <span>{t('kasir.searchingCamera')}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loadingCustomer && (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-accent" />
          <span className="text-sm text-muted-foreground">{t('kasir.loadingCustomer')}</span>
        </div>
      )}

      {/* Scanned Customer Details */}
      {customerData && !loadingCustomer && (
        <div className="flex animate-in flex-col gap-6 duration-300 fade-in slide-in-from-bottom-4">
          <Card className="border-border shadow-md">
            <CardHeader className="flex flex-row items-center gap-4 bg-accent/10 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <UserCheck className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base font-bold text-card-foreground">
                  {customerData.fullName}
                </CardTitle>
                <CardDescription className="truncate text-xs">{customerData.email}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-5">
              {/* Stamp Progress */}
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/40 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t('kasir.currentStamps')}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {customerData.currentStamps}
                  </span>
                  <span className="text-xs text-muted-foreground">{t('customer.stampLabel')}</span>
                </div>
                <div className="mt-2 grid grid-cols-10 gap-1">
                  {Array.from({ length: 10 }).map((_, index) => {
                    const isEarned = index < customerData.currentStamps
                    return (
                      <div
                        key={index}
                        className={cn('h-2 rounded-full', isEarned ? 'bg-accent' : 'bg-muted')}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Available Rewards */}
              <div className="space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t('kasir.availableRewards')}
                </span>
                {customerData.rewards.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground">{t('kasir.noActiveReward')}</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {customerData.rewards.map((reward) => (
                      <div
                        key={reward.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/5 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Gift className="h-5 w-5 shrink-0 text-accent" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-foreground">
                              {reward.reward_rules?.name}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {t('kasir.target', { count: reward.reward_rules?.target_stamps ?? 0 })}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleRedeemReward(reward.id)}
                          className="h-8 shrink-0 bg-accent py-1 text-xs font-semibold text-accent-foreground hover:bg-accent/90"
                        >
                          {t('kasir.redeemReward')}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 border-t border-border p-5">
              <Button
                disabled={isPending}
                onClick={handleAddStamp}
                className="w-full text-sm font-semibold"
              >
                {isPending ? t('kasir.processing') : t('kasir.addStamp')}
              </Button>

              <Button
                variant="outline"
                onClick={handleRescan}
                className="w-full text-sm font-semibold"
              >
                {t('kasir.scanOther')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
