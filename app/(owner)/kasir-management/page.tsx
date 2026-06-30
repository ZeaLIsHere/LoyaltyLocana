import { createClient } from '@/lib/supabase/server'
import KasirManagementClient from '@/components/kasir-management-client'

export default async function KasirManagementPage() {
  const supabase = await createClient()

  // Fetch cashier profiles
  const { data: cashiers } = await supabase
    .from('profiles')
    .select('id, full_name, email, is_active, created_at')
    .eq('role', 'kasir')
    .order('created_at', { ascending: false })

  return <KasirManagementClient cashiers={cashiers || []} />
}
