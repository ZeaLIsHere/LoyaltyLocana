'use server'

import { createClient, createServiceClient } from './server'
import { redirect } from 'next/navigation'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { success: false, error: 'Email dan password wajib diisi' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  // Redirect is handled by the page or middleware after success,
  // but we can also trigger a redirect directly in Server Actions.
  // We'll return success so the client component can redirect or show toast.
  return { success: true }
}

export async function signUpCustomer(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const birthDate = formData.get('birthDate') as string

  if (!email || !password || !fullName) {
    return { success: false, error: 'Semua kolom wajib diisi' }
  }

  if (password.length < 6) {
    return { success: false, error: 'Sandi minimal 6 karakter' }
  }

  // Create the customer with email pre-confirmed so they can log in immediately
  // (no email-confirmation step).
  const admin = await createServiceClient()

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: 'customer',
      birth_date: birthDate || null,
    },
  })

  if (error || !created.user) {
    return { success: false, error: error?.message || 'Gagal membuat akun' }
  }

  // Defense-in-depth: create the profile + loyalty_progress explicitly instead
  // of relying on the on_auth_user_created DB trigger. This guarantees the
  // customer is scannable right away on any Supabase project (incl. a fresh
  // Vercel deploy) even if the trigger isn't installed. upsert() is a no-op if
  // the trigger already created the rows.
  const userId = created.user.id

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      role: 'customer',
      full_name: fullName,
      email,
      is_active: true,
      birth_date: birthDate || null,
    },
    { onConflict: 'id' }
  )

  if (profileError) {
    return { success: false, error: profileError.message }
  }

  const { error: progressError } = await admin.from('loyalty_progress').upsert(
    { customer_id: userId, current_stamps: 0 },
    { onConflict: 'customer_id' }
  )

  if (progressError) {
    return { success: false, error: progressError.message }
  }

  // Auto-login: establish a session (sets auth cookies via the cookie-based
  // client) so the new customer goes straight into the app, no separate login
  // step. If this somehow fails, the account still exists and they can log in
  // manually — so we don't treat it as a signup failure.
  const supabase = await createClient()
  await supabase.auth.signInWithPassword({ email, password })

  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function updateProfileNameAndBirth(fullName: string, birthDate: string | null) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sesi berakhir, silakan login kembali' }
    const trimmed = fullName.trim()
    if (!trimmed) return { success: false, error: 'Nama tidak boleh kosong' }
    const { error } = await supabase
      .from('profiles')
      .update({ 
        full_name: trimmed, 
        birth_date: birthDate || null,
        updated_at: new Date().toISOString() 
      })
      .eq('id', user.id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Gagal memperbarui profil'
    return { success: false, error: message }
  }
}

export async function fetchCustomerScanData(customerId: string) {
  try {
    const supabase = await createClient()

    // Validate the caller is staff (kasir/owner) before reading customer data.
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Sesi kasir berakhir, silakan login kembali' }
    }
    const { data: caller } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!caller || (caller.role !== 'kasir' && caller.role !== 'owner')) {
      return { success: false, error: 'Akses ditolak' }
    }

    // Customer profiles aren't readable by a kasir under RLS (own-or-owner
    // only), so read customer data with the service client. Safe here because
    // the caller was just validated as staff above.
    const admin = await createServiceClient()

    // 1. Get customer profile
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', customerId)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Profil customer tidak ditemukan' }
    }

    if (profile.role !== 'customer') {
      return { success: false, error: 'QR Code bukan milik customer' }
    }

    if (!profile.is_active) {
      return { success: false, error: 'Akun customer dinonaktifkan' }
    }

    // 2. Get stamp progress
    const { data: progress } = await admin
      .from('loyalty_progress')
      .select('current_stamps')
      .eq('customer_id', customerId)
      .single()

    // 3. Get the active reward rules the cashier can redeem against. In the
    //    spend model there are no pre-granted rewards: the cashier picks a rule
    //    and the RPC spends the customer's stamp balance.
    const { data: rules } = await admin
      .from('reward_rules')
      .select('id, name, description, target_stamps')
      .eq('is_active', true)
      .order('target_stamps', { ascending: true })

    const formattedRules = (rules || []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      target_stamps: r.target_stamps,
    }))

    // Balance cap = highest active target (matches the add_stamp RPC).
    const maxTarget = formattedRules.reduce((m, r) => Math.max(m, r.target_stamps), 0)

    return {
      success: true,
      customer: {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        currentStamps: progress?.current_stamps || 0,
        maxTarget,
        rules: formattedRules,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat data customer'
    return { success: false, error: message }
  }
}

export async function addStampAction(customerId: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Sesi kasir berakhir, silakan login kembali' }
    }

    // Call add_stamp RPC function
    const { data, error } = await supabase.rpc('add_stamp', {
      p_customer_id: customerId,
      p_kasir_id: user.id,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // RPC returns JSON parsed as an object or string
    const result = typeof data === 'string' ? JSON.parse(data) : data

    return {
      success: result.success,
      // Surface the RPC's own message as `error` on failure so the UI can show
      // the real reason (cooldown / card full) instead of a generic fallback.
      error: result.success ? undefined : result.message,
      message: result.message,
      newStamps: result.new_stamps,
      cardFull: result.card_full ?? false,
      rewardEarned: result.reward_earned,
      rewardName: result.reward_name,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menambahkan stamp'
    return { success: false, error: message }
  }
}

export async function redeemRewardRuleAction(customerId: string, ruleId: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Sesi kasir berakhir, silakan login kembali' }
    }

    const { data, error } = await supabase.rpc('redeem_reward_rule', {
      p_customer_id: customerId,
      p_rule_id: ruleId,
      p_kasir_id: user.id,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data

    return {
      success: result.success,
      error: result.success ? undefined : result.message,
      message: result.message,
      newStamps: result.new_stamps,
      rewardName: result.reward_name,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menukarkan reward'
    return { success: false, error: message }
  }
}

export async function redeemRewardAction(rewardId: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Sesi kasir berakhir, silakan login kembali' }
    }

    // Call redeem_reward RPC function
    const { data, error } = await supabase.rpc('redeem_reward', {
      p_reward_id: rewardId,
      p_kasir_id: user.id,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data

    return {
      success: result.success,
      message: result.message,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menukarkan reward'
    return { success: false, error: message }
  }
}

// Owner-only: aggregate stats for a single customer (lifetime stamps earned and
// rewards redeemed) for the customer detail dialog. Counts only — no row data.
export async function fetchCustomerDetail(customerId: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Sesi berakhir, silakan login kembali' }
    }

    const { data: caller } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!caller || caller.role !== 'owner') {
      return { success: false, error: 'Akses ditolak' }
    }

    const [{ count: lifetimeStamps }, { count: rewardsRedeemed }] = await Promise.all([
      supabase
        .from('scan_logs')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .eq('action', 'add_stamp'),
      supabase
        .from('rewards')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .eq('status', 'used'),
    ])

    return {
      success: true,
      lifetimeStamps: lifetimeStamps || 0,
      rewardsRedeemed: rewardsRedeemed || 0,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat detail customer'
    return { success: false, error: message }
  }
}

export async function createCashierAction(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Sesi berakhir, silakan login kembali' }
    }

    // Check if user is owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'owner') {
      return { success: false, error: 'Akses ditolak. Hanya owner yang dapat mengelola kasir.' }
    }

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string

    if (!email || !password || !fullName) {
      return { success: false, error: 'Semua kolom wajib diisi' }
    }

    if (password.length < 6) {
      return { success: false, error: 'Password minimal 6 karakter' }
    }

    // We must use the Service Role Client to bypass normal registration
    // limitations and manually create cashier users.
    const { createServiceClient } = await import('./server')
    const adminSupabase = await createServiceClient()

    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'kasir',
        full_name: fullName,
      },
    })

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Gagal mendaftarkan akun kasir' }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan sistem'
    return { success: false, error: message }
  }
}

export async function toggleCashierStatusAction(cashierId: string, isActive: boolean) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Sesi berakhir' }
    }

    // Check owner role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'owner') {
      return { success: false, error: 'Akses ditolak' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', cashierId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui status kasir'
    return { success: false, error: message }
  }
}

export async function updateCashierNameAction(cashierId: string, fullName: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Sesi berakhir' }
    }

    // Check owner role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'owner') {
      return { success: false, error: 'Akses ditolak' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', cashierId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui nama kasir'
    return { success: false, error: message }
  }
}

export async function upsertRewardRuleAction(
  id: string | null,
  name: string,
  targetStamps: number,
  description: string | null,
  isActive: boolean
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Sesi berakhir' }
    }

    // Check owner role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'owner') {
      return { success: false, error: 'Akses ditolak' }
    }

    if (id) {
      // Update
      const { error } = await supabase
        .from('reward_rules')
        .update({
          name,
          target_stamps: targetStamps,
          description,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) return { success: false, error: error.message }
    } else {
      // Insert
      const { error } = await supabase
        .from('reward_rules')
        .insert({
          name,
          target_stamps: targetStamps,
          description,
          is_active: isActive,
          created_by: user.id,
        })

      if (error) return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menyimpan aturan reward'
    return { success: false, error: message }
  }
}

export async function deleteRewardRuleAction(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sesi berakhir' }

    // Check owner role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'owner') {
      return { success: false, error: 'Akses ditolak' }
    }

    const { error } = await supabase
      .from('reward_rules')
      .delete()
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus aturan reward'
    return { success: false, error: message }
  }
}

export async function deleteCashierAction(cashierId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sesi berakhir' }

    // Check owner role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'owner') {
      return { success: false, error: 'Akses ditolak' }
    }

    // Call service client to delete auth user, which cascades to public.profiles
    const { createServiceClient } = await import('./server')
    const adminSupabase = await createServiceClient()

    const { error } = await adminSupabase.auth.admin.deleteUser(cashierId)
    if (error) return { success: false, error: error.message }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus kasir'
    return { success: false, error: message }
  }
}

// Owner-only: edit a customer's profile (name + birth date). RLS only allows a
// user to update their OWN profile, so we use the service client after
// validating the caller is an owner.
export async function updateCustomerAction(
  customerId: string,
  fullName: string,
  birthDate: string | null
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sesi berakhir' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!profile || profile.role !== 'owner') {
      return { success: false, error: 'Akses ditolak' }
    }

    const trimmed = fullName.trim()
    if (!trimmed) return { success: false, error: 'Nama tidak boleh kosong' }

    const admin = await createServiceClient()
    const { error } = await admin
      .from('profiles')
      .update({
        full_name: trimmed,
        birth_date: birthDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId)
      .eq('role', 'customer')

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui customer'
    return { success: false, error: message }
  }
}

// Owner-only: permanently delete a customer (auth user + cascaded profile).
export async function deleteCustomerAction(customerId: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sesi berakhir' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!profile || profile.role !== 'owner') {
      return { success: false, error: 'Akses ditolak' }
    }

    const admin = await createServiceClient()
    const { error } = await admin.auth.admin.deleteUser(customerId)
    if (error) return { success: false, error: error.message }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus customer'
    return { success: false, error: message }
  }
}



