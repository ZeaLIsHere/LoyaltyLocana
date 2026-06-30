import { redirect } from 'next/navigation'
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch cashier profile name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // double check role just in case
  if (!profile || (profile.role !== 'kasir' && profile.role !== 'owner')) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen w-full justify-center bg-stone-100 dark:bg-stone-950">
      {/* Mobile-focused centered frame */}
      <div className="relative flex min-h-screen w-full max-w-md flex-col bg-white shadow-xl dark:bg-stone-900 border-x border-stone-200/50 dark:border-stone-800/50">
        
        {/* Header Bar */}
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-stone-200/60 bg-white/95 px-6 dark:border-stone-800 dark:bg-stone-900/95 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
              <Coffee className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-stone-900 dark:text-white">
                Locana
              </span>
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 uppercase dark:bg-amber-950/50 dark:text-amber-400">
                {profile.role}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 max-w-[100px] truncate">
              {profile.full_name}
            </span>
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-stone-500 hover:text-red-500 dark:text-stone-400"
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
