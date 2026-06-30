'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Gift, History, QrCode, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CustomerNav() {
  const pathname = usePathname()
  const t = useTranslations()

  const navItems = [
    { label: t('customer.home'), href: '/home', icon: QrCode },
    { label: t('customer.rewards'), href: '/rewards', icon: Gift },
    { label: t('customer.history'), href: '/history', icon: History },
    { label: t('customer.settings'), href: '/settings', icon: Settings },
  ]

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-border bg-card/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex h-full w-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-all duration-200 active:scale-95',
                isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center rounded-full px-3 py-1 transition-all duration-200',
                  isActive ? 'bg-accent/15' : 'bg-transparent'
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[10px]">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
