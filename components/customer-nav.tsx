'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Award, History, Home, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CustomerNav() {
  const pathname = usePathname()
  const t = useTranslations()

  const navItems = [
    {
      label: t('customer.home'),
      href: '/home',
      icon: Home,
    },
    {
      label: t('customer.rewards'),
      href: '/rewards',
      icon: Award,
    },
    {
      label: t('customer.history'),
      href: '/history',
      icon: History,
    },
    {
      label: t('customer.settings'),
      href: '/settings',
      icon: Settings,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-white/90 pb-safe backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/90">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center w-16 h-full gap-1 text-xs font-medium transition-all duration-200 active:scale-95',
                isActive
                  ? 'text-amber-600 dark:text-amber-500 scale-105'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center rounded-full px-3 py-1 transition-all duration-200',
                  isActive
                    ? 'bg-amber-100 dark:bg-amber-950/50'
                    : 'bg-transparent'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px]">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
