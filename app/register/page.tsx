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
        toast.error(result.error || t('auth.registerError'))
        return
      }

      toast.success(t('auth.registerSuccess'))
      // Session is already set by the server action — go straight into the app.
      // Routing to '/' lets the middleware send the customer to /home (and falls
      // back to /login if auto-login didn't take).
      router.push('/')
      router.refresh()
    })
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4">
      {/* Warm ambient glow */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          className="flex items-center gap-2 rounded-full border border-border bg-card/70 backdrop-blur-sm hover:bg-card"
        >
          <Globe className="h-4 w-4" />
          <span>{currentLocale === 'id' ? 'ID' : 'EN'}</span>
        </Button>
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Coffee className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl tracking-tight text-foreground">{t('app.name')}</h1>
            <p className="text-sm text-muted-foreground">{t('app.tagline')}</p>
          </div>
          {/* Signature: loyalty stamp-dot row */}
          <div className="flex items-center gap-1.5" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={
                  i < 2
                    ? 'h-2 w-2 rounded-full bg-accent'
                    : 'h-2 w-2 rounded-full border border-border bg-transparent'
                }
              />
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-xl shadow-foreground/5 sm:p-8">
          <div className="mb-6 space-y-1">
            <h2 className="text-2xl text-card-foreground">{t('auth.registerTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('auth.registerSubtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('auth.fullName')}</Label>
              <div className="relative">
                <User className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder={t('auth.fullNamePlaceholder')}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
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
                <KeyRound className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full font-semibold transition-transform active:scale-[0.98]"
            >
              {isPending ? t('common.loading') : t('auth.registerButton')}
            </Button>
          </form>

          <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
            {t('auth.hasAccount')}{' '}
            <Link href="/login" className="font-semibold text-accent hover:underline">
              {t('auth.loginButton')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
