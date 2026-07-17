import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getMyProfile } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/supabase/actions'
import { LogOut } from 'lucide-react'

export default async function KasirLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [t, profile] = await Promise.all([getTranslations(), getMyProfile()])

  if (!profile || (profile.role !== 'kasir' && profile.role !== 'owner')) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen w-full justify-center bg-muted">
      {/* Mobile-focused centered frame */}
      <div className="relative flex min-h-screen w-full max-w-md flex-col border-x border-border bg-background shadow-xl">
        {/* Header Bar */}
        <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/90 px-3 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="h-7 w-16 shrink-0 overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logoApps.png" alt={t('app.name')} className="h-full w-full object-cover object-center" />
            </div>
            <span className="shrink-0 rounded bg-accent/15 px-1 py-0.5 text-[8px] font-bold uppercase text-accent">
              {profile.role}
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            {/* Partner logo (top-right) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo_Bakti_BCA.png" alt="bakti BCA" className="h-7 w-auto shrink-0 object-contain" />
            <span className="max-w-[70px] truncate text-[11px] font-semibold text-muted-foreground">
              {profile.full_name}
            </span>
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={t('auth.logout')}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
