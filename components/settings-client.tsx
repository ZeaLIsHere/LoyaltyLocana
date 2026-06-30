'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Globe, LogOut, User, Mail } from 'lucide-react'

interface SettingsClientProps {
  fullName: string
  email: string
  initialLocale: string
  signOutAction: () => Promise<void>
}

export default function SettingsClient({
  fullName,
  email,
  initialLocale,
  signOutAction,
}: SettingsClientProps) {
  const t = useTranslations()
  const [currentLocale, setCurrentLocale] = useState(initialLocale)

  const handleLanguageChange = (checked: boolean) => {
    const nextLocale = checked ? 'en' : 'id'
    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`
    setCurrentLocale(nextLocale)
    window.location.reload()
  }

  // Get initials for profile placeholder
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-bold text-stone-900 dark:text-white">
          {t('customer.settings')}
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Ubah konfigurasi akun dan bahasa aplikasi Anda.
        </p>
      </div>

      {/* Profile Card */}
      <Card className="border-stone-200/60 shadow-sm dark:border-stone-800">
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="h-14 w-14 border border-stone-100 dark:border-stone-800">
            <AvatarFallback className="bg-amber-500 text-white font-extrabold text-lg">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-stone-400" />
              <span className="text-sm font-bold text-stone-900 dark:text-white truncate">
                {fullName}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Mail className="h-3.5 w-3.5 text-stone-400" />
              <span className="text-xs text-stone-500 dark:text-stone-400 truncate">
                {email}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language Preferences */}
      <Card className="border-stone-200/60 shadow-sm dark:border-stone-800">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Globe className="h-4 w-4 text-amber-500" />
            {t('common.language')}
          </CardTitle>
          <CardDescription>
            Pilih bahasa antarmuka aplikasi Locana.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-stone-850 dark:text-stone-200">
                English (Inggris)
              </span>
              <span className="text-[10px] text-stone-400">
                Aktifkan jika ingin menggunakan Bahasa Inggris.
              </span>
            </div>
            <Switch
              checked={currentLocale === 'en'}
              onCheckedChange={handleLanguageChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="pt-4">
        <Button
          onClick={() => signOutAction()}
          variant="outline"
          className="w-full justify-center gap-2 border-stone-200 text-stone-600 font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:border-stone-800 text-xs py-2 h-11"
        >
          <LogOut className="h-4 w-4" />
          <span>{t('auth.logout')}</span>
        </Button>
      </div>
    </div>
  )
}
