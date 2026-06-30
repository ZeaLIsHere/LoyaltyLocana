-- Harden redeem_reward against rapid double-submits (same class of bug as
-- add_stamp). The original reads status, checks it, then updates — two
-- concurrent calls can both read 'available' and both proceed, producing two
-- 'redeem_reward' audit logs for a single reward.
--
-- Fix: make the state change atomic with a conditional UPDATE
-- (WHERE status = 'available'). Row locking guarantees only the first concurrent
-- call matches; the second sees 0 rows affected and is rejected.

create or replace function public.redeem_reward(
    p_reward_id uuid,
    p_kasir_id uuid
)
returns json as $$
declare
    v_customer_id uuid;
    v_reward_name text;
    v_is_staff boolean;
    v_updated boolean;
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

    -- 2. Existence + details (for friendly messages and the audit log)
    select r.customer_id, rr.name into v_customer_id, v_reward_name
    from public.rewards r
    join public.reward_rules rr on r.reward_rule_id = rr.id
    where r.id = p_reward_id;

    if v_customer_id is null then
        return json_build_object('success', false, 'message', 'Reward not found.');
    end if;

    -- 3. Atomic state change: only succeeds if still available. Concurrent calls
    --    serialize on the row lock; the loser matches 0 rows.
    update public.rewards
    set status = 'used',
        used_at = now(),
        redeemed_by_kasir_id = p_kasir_id
    where id = p_reward_id and status = 'available';

    v_updated := found;

    if not v_updated then
        return json_build_object(
            'success', false,
            'message', 'Reward has already been redeemed.'
        );
    end if;

    -- 4. Insert scan log (only on a real redemption)
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
