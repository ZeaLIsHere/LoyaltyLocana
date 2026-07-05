import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that don't require authentication
const publicRoutes = ['/login', '/register']

// Role-based route access
const roleRoutes: Record<string, string[]> = {
  owner: ['/dashboard', '/customers', '/kasir-management', '/reward-rules', '/activity-logs'],
  kasir: ['/scan'],
  customer: ['/home', '/rewards', '/history', '/settings'],
}

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    // If user is already logged in and tries to access login/register, redirect to their dashboard
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile) {
        const redirectPath = getDefaultRoute(profile.role)
        return NextResponse.redirect(new URL(redirectPath, request.url))
      }
    }
    return supabaseResponse
  }

  // Protect all non-public routes: redirect to login if not authenticated
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Get user role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // Profile doesn't exist yet - might be a newly registered user
    // Allow access, the app will handle profile creation
    return supabaseResponse
  }

  const userRole = profile.role

  // Check role-based access
  const allowedRoutes = roleRoutes[userRole] || []
  const isAllowedRoute = allowedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (!isAllowedRoute && pathname !== '/') {
    // Redirect to appropriate dashboard
    const redirectPath = getDefaultRoute(userRole)
    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  // If accessing root (/), redirect to role-specific dashboard
  if (pathname === '/') {
    const redirectPath = getDefaultRoute(userRole)
    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  return supabaseResponse
}

function getDefaultRoute(role: string): string {
  switch (role) {
    case 'owner':
      return '/dashboard'
    case 'kasir':
      return '/scan'
    case 'customer':
      return '/home'
    default:
      return '/login'
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes - handled separately)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
