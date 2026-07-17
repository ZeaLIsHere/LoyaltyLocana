'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { signIn } from '@/lib/supabase/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Globe, KeyRound, Mail } from 'lucide-react'

export default function LoginPage() {
  const t = useTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
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
      const result = await signIn(formData)

      if (!result.success) {
        toast.error(result.error || t('auth.loginError'))
        return
      }

      toast.success(t('common.success'))

      const redirectTo = searchParams.get('redirectTo') || '/'
      router.push(redirectTo)
      router.refresh()
    })
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4">
      {/* Warm ambient glow */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      {/* Top bar: language toggle + partner logo side by side */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          className="flex items-center gap-2 rounded-full border border-border bg-card/70 backdrop-blur-sm hover:bg-card"
        >
          <Globe className="h-4 w-4" />
          <span>{currentLocale === 'id' ? 'ID' : 'EN'}</span>
        </Button>
        {/* Partner logo, next to the language toggle */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Logo_Bakti_BCA.png"
          alt="bakti BCA"
          className="pointer-events-none h-9 w-auto object-contain sm:h-10"
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="space-y-1">
            <div className="mx-auto h-48 w-48 overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logoApps.png" alt={t('app.name')} className="h-full w-full object-cover object-center" />
            </div>
            <p className="text-sm text-muted-foreground">{t('app.tagline')}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-xl shadow-foreground/5 sm:p-8">
          <div className="mb-6 space-y-1">
            <h2 className="text-2xl text-card-foreground">{t('auth.loginTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('auth.loginSubtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <KeyRound className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.passwordPlaceholder')}
                  required
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full font-semibold transition-transform active:scale-[0.98]"
            >
              {isPending ? t('common.loading') : t('auth.loginButton')}
            </Button>
          </form>

          <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
            {t('auth.noAccount')}{' '}
            <Link href="/register" className="font-semibold text-accent hover:underline">
              {t('auth.registerButton')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
