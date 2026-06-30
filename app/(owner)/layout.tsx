import { redirect } from 'next/navigation'
import { getMyProfile } from '@/lib/supabase/auth'
import OwnerSidebar from '@/components/owner-sidebar'
import { signOut } from '@/lib/supabase/actions'

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getMyProfile()

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
