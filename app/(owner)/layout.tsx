import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OwnerSidebar from '@/components/owner-sidebar'
import { signOut } from '@/lib/supabase/actions'

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Verify authenticated session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch owner profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // Double check user role is owner
  if (!profile || profile.role !== 'owner') {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
      {/* Sidebar Nav */}
      <OwnerSidebar ownerName={profile.full_name} signOutAction={signOut} />

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  )
}
