import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Creates a Supabase client with the service role key.
 * ONLY use this on server-side code (server actions, route handlers).
 * This bypasses RLS and has full database access.
 *
 * IMPORTANT: this must NOT carry the caller's cookie session. The SSR server
 * client (createServerClient) derives its Authorization bearer from the session
 * cookie — so with a logged-in kasir it would run requests AS the kasir and
 * re-enable RLS, defeating the purpose (this caused scan lookups to return 0
 * rows). We use the plain supabase-js client with no session, so the
 * service_role key is the bearer and RLS is genuinely bypassed.
 */
export async function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
