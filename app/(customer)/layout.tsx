import CustomerNav from '@/components/customer-nav'
import { Coffee } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations()

  return (
    <div className="flex min-h-screen w-full justify-center bg-muted">
      {/* Centered mobile-focused frame */}
      <div className="relative flex min-h-screen w-full max-w-md flex-col border-x border-border bg-background pb-20 shadow-xl">
        {/* Thin brand header */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-5 backdrop-blur-md">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Coffee className="h-4 w-4" />
          </span>
          <span className="text-xl tracking-tight text-foreground [font-family:var(--font-heading)]">
            {t('app.name')}
          </span>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">{children}</main>

        {/* Bottom Nav */}
        <CustomerNav />
      </div>
    </div>
  )
}
