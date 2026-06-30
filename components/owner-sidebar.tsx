'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LayoutDashboard, Users, Award, FileSpreadsheet, LogOut, Menu, X, Coffee } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface OwnerSidebarProps {
  ownerName: string
  signOutAction: () => Promise<void>
}

export default function OwnerSidebar({ ownerName, signOutAction }: OwnerSidebarProps) {
  const pathname = usePathname()
  const t = useTranslations()
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    {
      label: t('owner.dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: t('owner.kasirManagement'),
      href: '/kasir-management',
      icon: Users,
    },
    {
      label: t('owner.rewardRules'),
      href: '/reward-rules',
      icon: Award,
    },
    {
      label: t('owner.activityLogs'),
      href: '/activity-logs',
      icon: FileSpreadsheet,
    },
  ]

  const toggleSidebar = () => setIsOpen(!isOpen)

  return (
    <>
      {/* Mobile Top Navbar */}
      <header className="flex h-16 w-full items-center justify-between border-b border-stone-200 bg-white px-6 md:hidden dark:border-stone-800 dark:bg-stone-900 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white">
            <Coffee className="h-4 w-4" />
          </div>
          <span className="font-bold text-stone-900 dark:text-white">Locana</span>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      {/* Sidebar Frame */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-stone-200 bg-white transition-transform duration-300 md:translate-x-0 dark:border-stone-800 dark:bg-stone-900',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'md:sticky md:top-0 md:h-screen'
        )}
      >
        {/* Brand Logo Header */}
        <div className="flex h-16 items-center gap-2 px-6 border-b border-stone-200/50 dark:border-stone-800/50">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-white shadow-md">
            <Coffee className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-stone-900 dark:text-white text-sm tracking-tight">
              Locana Owner
            </span>
            <span className="text-[9px] text-stone-400 font-mono">Loyalty System</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 p-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]',
                  isActive
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                    : 'text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800/50'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer profile info & Sign Out */}
        <div className="border-t border-stone-200/50 p-4 dark:border-stone-800/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-stone-900 dark:text-white truncate">
                {ownerName}
              </span>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider">
                Cafe Owner
              </span>
            </div>
          </div>
          <Button
            onClick={() => signOutAction()}
            variant="outline"
            className="w-full justify-center gap-2 border-stone-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:border-stone-800 text-sm font-semibold h-10"
          >
            <LogOut className="h-4 w-4" />
            <span>{t('auth.logout')}</span>
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  )
}
