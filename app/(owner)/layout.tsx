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
      <div className="relative flex-1 flex flex-col min-w-0">
        {/* Partner logo (top-right). Hidden on mobile — the sticky mobile
            header already carries the "Locana" brand there, and this absolute
            logo would collide with it when the page scrolls. Shown on desktop
            (md+) where the top-right has room and no brand nearby.
            pointer-events-none so it never blocks a page's own top-right
            controls even if they overlap. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Logo_Bakti_BCA.png"
          alt="bakti BCA"
          className="pointer-events-none absolute right-10 top-8 z-20 hidden h-5 w-auto object-contain md:block"
        />
        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  )
}
