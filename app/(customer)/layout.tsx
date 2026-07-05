import CustomerNav from '@/components/customer-nav'
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
      <div className="relative isolate flex min-h-screen w-full max-w-md flex-col border-x border-border bg-background pb-20 shadow-xl">
        {/* Decorative backdrop (customer flair). Assets are pale cream, so
            brightness-0 recolors them to a dark, visible silhouette on the light
            theme; dark:brightness-100 restores the cream so they stay visible on
            dark. Sits behind content, non-interactive, clipped to the frame. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/splash.png" alt="" className="absolute -right-16 -top-10 w-64 rotate-12 opacity-[0.10] brightness-0 dark:opacity-[0.14] dark:brightness-100" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/splash.png" alt="" className="absolute -left-24 top-1/3 w-56 -rotate-12 opacity-[0.08] brightness-0 dark:opacity-[0.12] dark:brightness-100" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/coffee-beans.png" alt="" className="absolute left-4 top-24 w-20 -rotate-12 opacity-[0.16] brightness-0 dark:opacity-20 dark:brightness-100" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/coffee-beans.png" alt="" className="absolute right-2 top-2/3 w-24 rotate-6 opacity-[0.13] brightness-0 dark:opacity-20 dark:brightness-100" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/coffee-beans.png" alt="" className="absolute bottom-40 left-1/3 w-14 rotate-[24deg] opacity-[0.12] brightness-0 dark:opacity-20 dark:brightness-100" />
        </div>
        {/* Thin brand header */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-5 backdrop-blur-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="h-8 w-20 overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logoApps.png" alt={t('app.name')} className="h-full w-full object-cover object-center" />
          </div>
          {/* Partner logo (top-right) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-bca.png" alt="bakti BCA" className="ml-auto h-7 w-auto object-contain" />
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">{children}</main>

        {/* Bottom Nav */}
        <CustomerNav />
      </div>
    </div>
  )
}
