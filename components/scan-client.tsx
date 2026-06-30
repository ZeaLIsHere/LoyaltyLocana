'use client'

import { useEffect, useRef, useState, useTransition, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Html5Qrcode } from 'html5-qrcode'
import { toast } from 'sonner'
import { addStampAction, fetchCustomerScanData, redeemRewardAction } from '@/lib/supabase/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, RefreshCw, UserCheck, Gift } from 'lucide-react'

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
  const scannerId = 'qr-reader'

  // Load customer profile, stamps, and rewards after QR scan
  const loadCustomerData = useCallback(async (customerId: string) => {
    setLoadingCustomer(true)
    const result = await fetchCustomerScanData(customerId)
    setLoadingCustomer(false)

    if (!result.success || !result.customer) {
      toast.error(result.error || 'Customer tidak ditemukan')
      setScannerActive(true) // restart scanner
      return
    }

    setCustomerData(result.customer as CustomerData)
    toast.success(t('kasir.scanSuccess'))
  }, [t])

  // Initialize and stop scanner based on scannerActive state
  useEffect(() => {
    if (!scannerActive) {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((err) => console.error('Error stopping scanner:', err))
      }
      return
    }

    // Start scanner
    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerId)
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7
              return { width: size, height: size }
            },
          },
          (decodedText) => {
            // Scan Success
            setScannerActive(false)
            loadCustomerData(decodedText)
          },
          () => {
            // Ignore scan errors/warnings as they trigger continuously during detection
          }
        )
      } catch (err) {
        console.error('Error starting scanner:', err)
        toast.error('Gagal mengakses kamera. Pastikan izin kamera telah diberikan.')
      }
    }

    // Small delay to ensure the DOM element with id="qr-reader" is fully rendered
    const timer = setTimeout(() => {
      startScanner()
    }, 300)

    return () => {
      clearTimeout(timer)
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((err) => console.error('Error stopping scanner during cleanup:', err))
      }
    }
  }, [scannerActive, loadCustomerData])

  // Action: Add Stamp
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
        toast.success(`Selamat! Reward baru didapatkan: ${result.rewardName}`, {
          duration: 5000,
          icon: <Gift className="h-5 w-5 text-amber-500" />,
        })
      }

      // Refresh customer data to update UI
      loadCustomerData(customerData.id)
    })
  }

  // Action: Redeem Reward
  const handleRedeemReward = (rewardId: string) => {
    if (!customerData) return

    startTransition(async () => {
      const result = await redeemRewardAction(rewardId)

      if (!result.success) {
        toast.error(result.error || t('common.error'))
        return
      }

      toast.success(t('kasir.rewardRedeemed'))

      // Refresh customer data to update UI
      loadCustomerData(customerData.id)
    })
  }

  // Rescan / Reset
  const handleRescan = () => {
    setCustomerData(null)
    setScannerActive(true)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-stone-900 dark:text-white">
          {t('kasir.scanTitle')}
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {t('kasir.scanInstruction')}
        </p>
      </div>

      {/* Scanner Element */}
      {scannerActive && (
        <Card className="overflow-hidden border-stone-200/60 shadow-md dark:border-stone-800">
          <CardContent className="flex flex-col items-center justify-center p-6 bg-stone-950 text-white relative">
            <div
              id={scannerId}
              className="w-full aspect-square max-w-sm rounded-xl overflow-hidden bg-black"
            />
            {/* Guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-amber-500 border-dashed rounded-2xl animate-pulse" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-stone-400">
              <Camera className="h-4 w-4 text-amber-500" />
              <span>Mencari kamera...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loadingCustomer && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
          <span className="text-sm text-stone-500">Memuat profil customer...</span>
        </div>
      )}

      {/* Scanned Customer Details */}
      {customerData && !loadingCustomer && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Card className="border-stone-200/60 shadow-md dark:border-stone-800">
            <CardHeader className="flex flex-row items-center gap-4 bg-amber-50/50 p-4 dark:bg-stone-900/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white">
                <UserCheck className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-bold text-stone-900 dark:text-white truncate">
                  {customerData.fullName}
                </CardTitle>
                <CardDescription className="text-xs text-stone-500 truncate">
                  {customerData.email}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Stamp Progress card */}
              <div className="flex flex-col gap-2 rounded-xl border border-stone-100 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-900/30">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                  {t('kasir.currentStamps')}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-stone-900 dark:text-white">
                    {customerData.currentStamps}
                  </span>
                  <span className="text-xs text-stone-500">Stamp</span>
                </div>
                <div className="grid grid-cols-10 gap-1 mt-2">
                  {Array.from({ length: 10 }).map((_, index) => {
                    const isEarned = index < customerData.currentStamps
                    return (
                      <div
                        key={index}
                        className={`h-2 rounded-full ${
                          isEarned ? 'bg-amber-500' : 'bg-stone-200 dark:bg-stone-800'
                        }`}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Available Rewards */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  {t('kasir.availableRewards')}
                </span>
                {customerData.rewards.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">Tidak ada reward yang siap ditukarkan.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {customerData.rewards.map((reward) => (
                      <div
                        key={reward.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/30 dark:border-amber-950/30 dark:bg-amber-950/10"
                      >
                        <div className="flex items-center gap-3">
                          <Gift className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-stone-900 dark:text-white truncate">
                              {reward.reward_rules?.name || 'Gratis Kopi'}
                            </p>
                            <p className="text-[10px] text-stone-500 truncate">
                              Target {reward.reward_rules?.target_stamps} Stamp
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleRedeemReward(reward.id)}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold shrink-0 text-xs py-1 h-8"
                        >
                          {t('kasir.redeemReward')}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 border-t border-stone-100 p-6 dark:border-stone-800">
              <Button
                disabled={isPending}
                onClick={handleAddStamp}
                className="w-full bg-amber-500 hover:bg-amber-600 font-semibold text-white text-sm"
              >
                {isPending ? t('common.loading') : t('kasir.addStamp')}
              </Button>

              <Button
                variant="outline"
                onClick={handleRescan}
                className="w-full border-stone-200 text-stone-600 font-semibold text-sm hover:bg-stone-50"
              >
                Scan Customer Lain
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
