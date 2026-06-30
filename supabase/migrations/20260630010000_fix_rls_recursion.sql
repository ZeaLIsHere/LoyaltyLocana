-- Fix: RLS infinite recursion on profiles (and policies that subquery profiles).
-- Helpers run as SECURITY DEFINER so they read role without triggering RLS.

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'owner' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role in ('owner','kasir') from public.profiles where id = auth.uid()), false);
$$;

-- PROFILES
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Owners can view all profiles" on public.profiles;
drop policy if exists "Users can update their own profile details" on public.profiles;

create policy "profiles_select_own_or_owner" on public.profiles
  for select using (auth.uid() = id or public.is_owner());
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- LOYALTY PROGRESS
drop policy if exists "Customers can view their own progress" on public.loyalty_progress;
drop policy if exists "Staff (owners, kasir) can view all progress" on public.loyalty_progress;
create policy "progress_select_own_or_staff" on public.loyalty_progress
  for select using (auth.uid() = customer_id or public.is_staff());

-- REWARD RULES
drop policy if exists "Everyone can view active rules" on public.reward_rules;
drop policy if exists "Owners can view all rules" on public.reward_rules;
drop policy if exists "Only Owners can modify rules" on public.reward_rules;
create policy "reward_rules_select" on public.reward_rules
  for select using (is_active = true or public.is_owner());
create policy "reward_rules_modify" on public.reward_rules
  for all using (public.is_owner()) with check (public.is_owner());

-- REWARDS
drop policy if exists "Customers can view their own rewards" on public.rewards;
drop policy if exists "Staff (owners, kasir) can view all rewards" on public.rewards;
create policy "rewards_select_own_or_staff" on public.rewards
  for select using (auth.uid() = customer_id or public.is_staff());

-- SCAN LOGS
drop policy if exists "Owners can view all scan logs" on public.scan_logs;
drop policy if exists "Kasir can view their own scan logs" on public.scan_logs;
drop policy if exists "Customers can view their own scan logs" on public.scan_logs;
create policy "scan_logs_select" on public.scan_logs
  for select using (
    public.is_owner() or auth.uid() = kasir_id or auth.uid() = customer_id
  );
