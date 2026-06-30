import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/supabase/actions'
import { Coffee, LogOut } from 'lucide-react'

export default async function KasirLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const t = await getTranslations()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'kasir' && profile.role !== 'owner')) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen w-full justify-center bg-muted">
      {/* Mobile-focused centered frame */}
      <div className="relative flex min-h-screen w-full max-w-md flex-col border-x border-border bg-background shadow-xl">
        {/* Header Bar */}
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Coffee className="h-4 w-4" />
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg tracking-tight text-foreground [font-family:var(--font-heading)]">
                {t('app.name')}
              </span>
              <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-accent">
                {profile.role}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="max-w-[100px] truncate text-xs font-semibold text-muted-foreground">
              {profile.full_name}
            </span>
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                aria-label={t('auth.logout')}
              >
                <LogOut className="h-4 w-4" />
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
