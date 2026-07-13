'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LayoutDashboard, UserCheck, Users, Award, FileSpreadsheet, LogOut, Menu, X } from 'lucide-react'
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
    { label: t('owner.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { label: t('owner.customersList') || 'Daftar Customer', href: '/customers', icon: Users },
    { label: t('owner.kasirManagement'), href: '/kasir-management', icon: UserCheck },
    { label: t('owner.rewardRules'), href: '/reward-rules', icon: Award },
    { label: t('owner.activityLogs'), href: '/activity-logs', icon: FileSpreadsheet },
  ]

  const toggleSidebar = () => setIsOpen(!isOpen)

  return (
    <>
      {/* Mobile Top Navbar */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-sidebar-border bg-sidebar px-6 shadow-sm md:hidden">
        <div className="flex items-center gap-2">
          <span className="text-lg tracking-tight text-sidebar-foreground [font-family:var(--font-heading)]">
            {t('app.name')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Partner logo, beside the burger. eslint-disable-next-line @next/next/no-img-element */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo_Bakti_BCA.png" alt="bakti BCA" className="h-5 w-auto object-contain" />
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Menu">
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </header>

      {/* Sidebar Frame */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'md:sticky md:top-0 md:h-screen'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <div className="flex flex-col">
            <span className="text-sm tracking-tight text-sidebar-foreground [font-family:var(--font-heading)]">
              {t('owner.panelTitle')}
            </span>
            <span className="text-[9px] text-muted-foreground">
              {t('owner.loyaltySystem')}
            </span>
          </div>
        </div>

        {/* Navigation */}
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
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/15 hover:text-sidebar-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer profile & Sign Out */}
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-4 flex min-w-0 flex-col">
            <span className="truncate text-xs font-bold text-sidebar-foreground">{ownerName}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t('owner.ownerRole')}
            </span>
          </div>
          <Button
            onClick={() => signOutAction()}
            variant="outline"
            className="h-10 w-full justify-center gap-2 text-sm font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span>{t('auth.logout')}</span>
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-foreground/40 md:hidden" onClick={toggleSidebar} />
      )}
    </>
  )
}
