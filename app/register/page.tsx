'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { signUpCustomer } from '@/lib/supabase/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Coffee, Globe, KeyRound, Mail, User } from 'lucide-react'

export default function RegisterPage() {
  const t = useTranslations()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentLocale, setCurrentLocale] = useState(() => {
    if (typeof window !== 'undefined') {
      const match = document.cookie.match(/(?:^|; )locale=([^;]*)/)
      return match ? match[1] : 'id'
    }
    return 'id'
  })

  const toggleLanguage = () => {
    const nextLocale = currentLocale === 'id' ? 'en' : 'id'
    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`
    setCurrentLocale(nextLocale)
    window.location.reload()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await signUpCustomer(formData)

      if (!result.success) {
        toast.error(result.error || t('common.error'))
        return
      }

      toast.success('Pendaftaran berhasil! Silakan login.')
      router.push('/login')
    })
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-amber-50 via-stone-100 to-amber-100 p-4 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      {/* Decorative Blur Orbs */}
      <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-amber-300/30 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />

      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          className="flex items-center gap-2 rounded-full border border-stone-200 bg-white/50 backdrop-blur-sm hover:bg-white/80 dark:border-stone-800 dark:bg-stone-900/50"
        >
          <Globe className="h-4 w-4" />
          <span>{currentLocale === 'id' ? 'ID' : 'EN'}</span>
        </Button>
      </div>

      <Card className="w-full max-w-md border-white/40 bg-white/80 shadow-2xl backdrop-blur-md dark:border-stone-800/80 dark:bg-stone-900/80">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg animate-bounce">
            <Coffee className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
              {t('app.name')}
            </CardTitle>
            <CardDescription className="text-stone-500 dark:text-stone-400">
              {t('auth.registerTitle')}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-stone-700 dark:text-stone-300">
                {t('auth.fullName')}
              </Label>
              <div className="relative">
                <User className="absolute top-3 left-3 h-4 w-4 text-stone-400" />
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Andi Pratama"
                  required
                  className="pl-10 focus-visible:ring-amber-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-stone-700 dark:text-stone-300">
                {t('auth.email')}
              </Label>
              <div className="relative">
                <Mail className="absolute top-3 left-3 h-4 w-4 text-stone-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@cafe.com"
                  required
                  className="pl-10 focus-visible:ring-amber-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-stone-700 dark:text-stone-300">
                {t('auth.password')}
              </Label>
              <div className="relative">
                <KeyRound className="absolute top-3 left-3 h-4 w-4 text-stone-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="pl-10 focus-visible:ring-amber-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full bg-amber-500 font-semibold text-white transition-all duration-200 hover:bg-amber-600 active:scale-95 shadow-md shadow-amber-500/20"
            >
              {isPending ? t('common.loading') : t('auth.registerButton')}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 border-t border-stone-100 pt-4 text-center text-sm dark:border-stone-800">
          <p className="text-stone-500 dark:text-stone-400">
            {t('auth.hasAccount')}{' '}
            <Link
              href="/login"
              className="font-semibold text-amber-600 hover:text-amber-500 dark:text-amber-400"
            >
              {t('auth.loginButton')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
