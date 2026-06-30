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

  if (!email || !password || !fullName) {
    return { success: false, error: 'Semua kolom wajib diisi' }
  }

  if (password.length < 6) {
    return { success: false, error: 'Sandi minimal 6 karakter' }
  }

  const supabase = await createClient()

  // Register with metadata so trigger on_auth_user_created automatically
  // populates public.profiles and public.loyalty_progress
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'customer',
      },
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function updateProfileName(fullName: string) {
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
      .update({ full_name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Gagal memperbarui nama'
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

    // 3. Get available rewards with rule details
    const { data: rewards } = await admin
      .from('rewards')
      .select(`
        id,
        status,
        earned_at,
        reward_rules (
          name,
          description,
          target_stamps
        )
      `)
      .eq('customer_id', customerId)
      .eq('status', 'available')

    interface SupabaseRewardRow {
      id: string
      status: string
      earned_at: string
      reward_rules: {
        name: string
        description: string | null
        target_stamps: number
      } | Array<{
        name: string
        description: string | null
        target_stamps: number
      }> | null
    }

    const formattedRewards = ((rewards || []) as unknown as SupabaseRewardRow[]).map((r) => {
      const rulesData = Array.isArray(r.reward_rules) ? r.reward_rules[0] : r.reward_rules
      return {
        id: r.id,
        status: r.status,
        earned_at: r.earned_at,
        reward_rules: rulesData ? {
          name: rulesData.name,
          description: rulesData.description,
          target_stamps: rulesData.target_stamps,
        } : null,
      }
    })

    return {
      success: true,
      customer: {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        currentStamps: progress?.current_stamps || 0,
        rewards: formattedRewards,
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
      message: result.message,
      newStamps: result.new_stamps,
      rewardEarned: result.reward_earned,
      rewardName: result.reward_name,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menambahkan stamp'
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


