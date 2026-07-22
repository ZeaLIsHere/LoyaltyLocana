import CustomersClient from '@/components/customers-client'
import { DUMMY_CUSTOMERS, DUMMY_REWARD_TARGET } from '@/lib/dummy-data'

// DUMMY DATA — this page lists the 108 simulated customers from
// `skema-update-account-and-data.pdf` instead of querying Supabase. Because the
// rows have no database counterpart, `demo` disables the detail/edit/delete
// dialog. To go back to live data, restore the Supabase query from git history
// and drop the `demo` prop.
export default async function CustomersPage() {
  return <CustomersClient customers={DUMMY_CUSTOMERS} rewardTarget={DUMMY_REWARD_TARGET} demo />
}
