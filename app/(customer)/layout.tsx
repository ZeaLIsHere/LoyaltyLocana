import CustomerNav from '@/components/customer-nav'

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen w-full justify-center bg-stone-100 dark:bg-stone-950">
      {/* Centered mobile-focused frame */}
      <div className="relative flex min-h-screen w-full max-w-md flex-col bg-white pb-20 shadow-xl dark:bg-stone-900 border-x border-stone-200/50 dark:border-stone-800/50">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">{children}</main>

        {/* Floating Bottom Nav */}
        <CustomerNav />
      </div>
    </div>
  )
}
