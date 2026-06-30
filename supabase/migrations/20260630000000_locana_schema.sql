-- Locana Database Schema Migration
-- Stage 2: Tables, Indexes, RLS Policies, and RPC Functions

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. TABLES DEFINITIONS
-- ==========================================

-- Profiles table (stores user metadata and roles)
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    role text not null check (role in ('owner', 'kasir', 'customer')),
    full_name text not null,
    email text not null,
    is_active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Loyalty progress table (tracks customer stamps)
create table public.loyalty_progress (
    customer_id uuid references public.profiles(id) on delete cascade primary key,
    current_stamps integer default 0 not null check (current_stamps >= 0),
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Reward rules table (defined by owners)
create table public.reward_rules (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    description text,
    target_stamps integer not null check (target_stamps > 0),
    is_active boolean default true not null,
    created_by uuid references public.profiles(id) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Rewards table (earned by customers, redeemed by cashiers)
create table public.rewards (
    id uuid default gen_random_uuid() primary key,
    customer_id uuid references public.profiles(id) on delete cascade not null,
    reward_rule_id uuid references public.reward_rules(id) on delete cascade not null,
    status text default 'available' not null check (status in ('available', 'used')),
    earned_at timestamp with time zone default timezone('utc'::text, now()) not null,
    used_at timestamp with time zone,
    redeemed_by_kasir_id uuid references public.profiles(id)
);

-- Scan logs table (immutable audit trail)
create table public.scan_logs (
    id uuid default gen_random_uuid() primary key,
    customer_id uuid references public.profiles(id) on delete cascade not null,
    kasir_id uuid references public.profiles(id) on delete cascade not null,
    action text not null check (action in ('add_stamp', 'redeem_reward', 'rejected_cooldown')),
    details text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 2. INDEXES FOR PERFORMANCE
-- ==========================================
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_reward_rules_active on public.reward_rules(is_active);
create index if not exists idx_rewards_customer_status on public.rewards(customer_id, status);
create index if not exists idx_scan_logs_customer_cooldown on public.scan_logs(customer_id, action, created_at desc);
create index if not exists idx_scan_logs_kasir on public.scan_logs(kasir_id);

-- ==========================================
-- 3. TRIGGERS FOR PROFILE & PROGRESS AUTO-CREATION
-- ==========================================

-- Function to handle new user signup from auth.users
create or replace function public.handle_new_user()
returns trigger as $$
declare
    v_role text;
    v_full_name text;
begin
    -- Extract metadata from raw_user_meta_data
    v_role := coalesce(new.raw_user_meta_data->>'role', 'customer');
    v_full_name := coalesce(new.raw_user_meta_data->>'full_name', 'User');

    -- Insert into public profiles
    insert into public.profiles (id, role, full_name, email, is_active)
    values (
        new.id,
        v_role,
        v_full_name,
        new.email,
        true
    );

    -- If the role is customer, initialize loyalty progress
    if v_role = 'customer' then
        insert into public.loyalty_progress (customer_id, current_stamps)
        values (new.id, 0);
    end if;

    return new;
end;
$$ language plpgsql security definer;

-- Trigger to execute handle_new_user function on insert in auth.users
create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

alter table public.profiles enable row level security;
alter table public.loyalty_progress enable row level security;
alter table public.reward_rules enable row level security;
alter table public.rewards enable row level security;
alter table public.scan_logs enable row level security;

-- PROFILES POLICIES
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Owners can view all profiles"
    on public.profiles for select
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'owner'
        )
    );

create policy "Users can update their own profile details"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- LOYALTY PROGRESS POLICIES
create policy "Customers can view their own progress"
    on public.loyalty_progress for select
    using (auth.uid() = customer_id);

create policy "Staff (owners, kasir) can view all progress"
    on public.loyalty_progress for select
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role in ('owner', 'kasir')
        )
    );

-- REWARD RULES POLICIES
create policy "Everyone can view active rules"
    on public.reward_rules for select
    using (is_active = true);

create policy "Owners can view all rules"
    on public.reward_rules for select
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'owner'
        )
    );

create policy "Only Owners can modify rules"
    on public.reward_rules for all
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'owner'
        )
    )
    with check (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'owner'
        )
    );

-- REWARDS POLICIES
create policy "Customers can view their own rewards"
    on public.rewards for select
    using (auth.uid() = customer_id);

create policy "Staff (owners, kasir) can view all rewards"
    on public.rewards for select
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role in ('owner', 'kasir')
        )
    );

-- SCAN LOGS POLICIES
create policy "Owners can view all scan logs"
    on public.scan_logs for select
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'owner'
        )
    );

create policy "Kasir can view their own scan logs"
    on public.scan_logs for select
    using (auth.uid() = kasir_id);

create policy "Customers can view their own scan logs"
    on public.scan_logs for select
    using (auth.uid() = customer_id);

-- ==========================================
-- 5. POSTGRES FUNCTIONS / RPC
-- ==========================================

-- RPC: Add Stamp (checks cooldown, increments stamp, handles rewards)
create or replace function public.add_stamp(
    p_customer_id uuid,
    p_kasir_id uuid
)
returns json as $$
declare
    v_cooldown_interval interval := interval '5 minutes';
    v_last_scan timestamp with time zone;
    v_current_stamps integer;
    v_target_stamps integer;
    v_rule_id uuid;
    v_reward_name text;
    v_reward_earned boolean := false;
    v_is_staff boolean;
begin
    -- 1. Security Check: Only kasir or owner can add stamps
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('kasir', 'owner') and is_active = true
    ) into v_is_staff;

    if not v_is_staff then
        return json_build_object(
            'success', false,
            'message', 'Unauthorized. Only active cashiers or owners can add stamps.'
        );
    end if;

    -- 2. Cooldown Check
    select created_at into v_last_scan
    from public.scan_logs
    where customer_id = p_customer_id
      and action = 'add_stamp'
    order by created_at desc
    limit 1;

    if v_last_scan is not null and (now() - v_last_scan) < v_cooldown_interval then
        -- Insert rejected cooldown log
        insert into public.scan_logs (customer_id, kasir_id, action, details)
        values (
            p_customer_id,
            p_kasir_id,
            'rejected_cooldown',
            'Stamp scan rejected due to cooldown period.'
        );

        return json_build_object(
            'success', false,
            'message', 'Cooldown active. Please wait 5 minutes between stamps.'
        );
    end if;

    -- 3. Add stamp
    update public.loyalty_progress
    set current_stamps = current_stamps + 1,
        updated_at = now()
    where customer_id = p_customer_id
    returning current_stamps into v_current_stamps;

    -- 4. Check if stamp count meets any active reward rule target
    -- Fetch the active reward rule with the lowest target that the customer has reached
    select id, name, target_stamps into v_rule_id, v_reward_name, v_target_stamps
    from public.reward_rules
    where is_active = true
      and target_stamps <= v_current_stamps
    order by target_stamps desc
    limit 1;

    if v_rule_id is not null then
        -- Reward earned! Create reward record
        insert into public.rewards (customer_id, reward_rule_id, status)
        values (p_customer_id, v_rule_id, 'available');

        -- Deduct target stamps from customer progress (supports carryover of extra stamps)
        update public.loyalty_progress
        set current_stamps = v_current_stamps - v_target_stamps,
            updated_at = now()
        where customer_id = p_customer_id
        returning current_stamps into v_current_stamps;

        v_reward_earned := true;
    end if;

    -- 5. Insert scan log
    insert into public.scan_logs (customer_id, kasir_id, action, details)
    values (
        p_customer_id,
        p_kasir_id,
        'add_stamp',
        case 
            when v_reward_earned then 'Stamp added. Reward earned: ' || v_reward_name
            else 'Stamp added.'
        end
    );

    return json_build_object(
        'success', true,
        'message', 'Stamp added successfully.',
        'new_stamps', v_current_stamps,
        'reward_earned', v_reward_earned,
        'reward_name', coalesce(v_reward_name, '')
    );
end;
$$ language plpgsql security definer;

-- RPC: Redeem Reward (validates and marks reward as used)
create or replace function public.redeem_reward(
    p_reward_id uuid,
    p_kasir_id uuid
)
returns json as $$
declare
    v_reward_status text;
    v_customer_id uuid;
    v_reward_name text;
    v_is_staff boolean;
begin
    -- 1. Security Check: Only kasir or owner can redeem rewards
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('kasir', 'owner') and is_active = true
    ) into v_is_staff;

    if not v_is_staff then
        return json_build_object(
            'success', false,
            'message', 'Unauthorized. Only active cashiers or owners can redeem rewards.'
        );
    end if;

    -- 2. Fetch reward status and details
    select r.status, r.customer_id, rr.name into v_reward_status, v_customer_id, v_reward_name
    from public.rewards r
    join public.reward_rules rr on r.reward_rule_id = rr.id
    where r.id = p_reward_id;

    if v_reward_status is null then
        return json_build_object(
            'success', false,
            'message', 'Reward not found.'
        );
    end if;

    if v_reward_status = 'used' then
        return json_build_object(
            'success', false,
            'message', 'Reward has already been redeemed.'
        );
    end if;

    -- 3. Update Reward Status
    update public.rewards
    set status = 'used',
        used_at = now(),
        redeemed_by_kasir_id = p_kasir_id
    where id = p_reward_id;

    -- 4. Insert scan log
    insert into public.scan_logs (customer_id, kasir_id, action, details)
    values (
        v_customer_id,
        p_kasir_id,
        'redeem_reward',
        'Reward redeemed: ' || v_reward_name
    );

    return json_build_object(
        'success', true,
        'message', 'Reward redeemed successfully.'
    );
end;
$$ language plpgsql security definer;
