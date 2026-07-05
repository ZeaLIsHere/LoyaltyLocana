import { cache } from 'react'
import { createClient } from './server'

/**
 * Per-request cached session user.
 *
 * Uses getSession() (reads the auth cookie locally) instead of getUser()
 * (network round-trip). The token is already validated & refreshed by the
 * middleware (proxy.ts -> updateSession) on every request, and RLS still
 * enforces data access at the database layer — so render-time layers can
 * trust the cookie session for routing/display without re-validating.
 *
 * React's cache() dedupes calls within a single render pass, so a layout and
 * its page share one result instead of each hitting Supabase.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.user ?? null
})

/**
 * Per-request cached profile for the current session user.
 * Returns null when there's no session. Deduped across layout + page.
 */
export const getMyProfile = cache(async () => {
  const user = await getSessionUser()
  if (!user) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, birth_date')
    .eq('id', user.id)
    .single()
  return data
})
