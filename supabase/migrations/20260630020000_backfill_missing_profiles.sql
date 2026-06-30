-- Fix: auth users that have no public.profiles row (created before the
-- on_auth_user_created trigger was active, or inserted manually). Their scan
-- lookups fail with "customer not found" because no profile exists.
--
-- This migration (a) re-asserts the trigger so future signups are covered, and
-- (b) backfills the missing profiles + loyalty_progress rows. Both are idempotent.

-- (a) Ensure the trigger + function exist (same as schema migration).
create or replace function public.handle_new_user()
returns trigger as $$
declare
    v_role text;
    v_full_name text;
begin
    v_role := coalesce(new.raw_user_meta_data->>'role', 'customer');
    v_full_name := coalesce(new.raw_user_meta_data->>'full_name', 'User');

    insert into public.profiles (id, role, full_name, email, is_active)
    values (new.id, v_role, v_full_name, new.email, true)
    on conflict (id) do nothing;

    if v_role = 'customer' then
        insert into public.loyalty_progress (customer_id, current_stamps)
        values (new.id, 0)
        on conflict (customer_id) do nothing;
    end if;

    return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- (b) Backfill profiles for any existing auth user without one.
insert into public.profiles (id, role, full_name, email, is_active)
select
    u.id,
    coalesce(u.raw_user_meta_data->>'role', 'customer'),
    coalesce(u.raw_user_meta_data->>'full_name', 'User'),
    u.email,
    true
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Backfill loyalty_progress for customer profiles missing it.
insert into public.loyalty_progress (customer_id, current_stamps)
select p.id, 0
from public.profiles p
left join public.loyalty_progress lp on lp.customer_id = p.id
where p.role = 'customer' and lp.customer_id is null;
