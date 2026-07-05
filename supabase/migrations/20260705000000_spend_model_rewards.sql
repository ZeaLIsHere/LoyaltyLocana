-- Switch the loyalty engine from AUTO-GRANT to a "spend & choose" model with the
-- stamp balance CAPPED at the highest active reward target.
--
-- Behaviour:
--   * add_stamp no longer auto-creates a reward or resets the card. It just
--     increments the customer's stamp *balance*, never above the highest active
--     reward target (the card "fills up" and holds until something is redeemed).
--     Cooldown (10s) + per-customer advisory lock are preserved.
--   * redeem_reward_rule (NEW): the cashier redeems a specific reward RULE for the
--     customer. It verifies the balance covers the rule's target, subtracts the
--     target from the balance, records the redemption in `rewards` (status 'used')
--     and writes an audit log. Row-locked so double-submits can't overspend.
--   * Seeds the two starter rules (owner-editable afterwards from /reward-rules).
--
-- The legacy redeem_reward(reward_id) RPC is left in place for backward compat
-- but is no longer used by the app (no more pre-granted 'available' rewards).

-- ==========================================================================
-- add_stamp v3 — increment-only, capped, no auto-grant
-- ==========================================================================
create or replace function public.add_stamp(
    p_customer_id uuid,
    p_kasir_id uuid
)
returns json as $$
declare
    v_cooldown_interval interval := interval '10 seconds';
    v_last_scan timestamp with time zone;
    v_current_stamps integer;
    v_max_target integer;
    v_is_staff boolean;
    v_is_full boolean;
begin
    -- 0. Serialize concurrent add_stamp calls for the same customer.
    perform pg_advisory_xact_lock(hashtext(p_customer_id::text));

    -- 1. Security: only active kasir/owner may add stamps.
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

    -- 2. Cooldown: reject if the last add_stamp was too recent.
    select created_at into v_last_scan
    from public.scan_logs
    where customer_id = p_customer_id
      and action = 'add_stamp'
    order by created_at desc
    limit 1;

    if v_last_scan is not null and (now() - v_last_scan) < v_cooldown_interval then
        insert into public.scan_logs (customer_id, kasir_id, action, details)
        values (
            p_customer_id,
            p_kasir_id,
            'rejected_cooldown',
            'Stamp scan rejected due to cooldown period.'
        );

        return json_build_object(
            'success', false,
            'message', 'Cooldown active. Please wait a few seconds between stamps.'
        );
    end if;

    -- 3. Balance cap = highest active reward target (null => no rules => no cap).
    select max(target_stamps) into v_max_target
    from public.reward_rules
    where is_active = true;

    select current_stamps into v_current_stamps
    from public.loyalty_progress
    where customer_id = p_customer_id;

    -- 4. Card already full? Reject without incrementing so the balance can't
    --    exceed the top reward target.
    if v_max_target is not null and v_current_stamps >= v_max_target then
        return json_build_object(
            'success', false,
            'card_full', true,
            'new_stamps', v_current_stamps,
            'message', 'Stamp card is full. Redeem a reward before adding more stamps.'
        );
    end if;

    -- 5. Increment (clamped to the cap).
    update public.loyalty_progress
    set current_stamps = case
            when v_max_target is null then current_stamps + 1
            else least(current_stamps + 1, v_max_target)
        end,
        updated_at = now()
    where customer_id = p_customer_id
    returning current_stamps into v_current_stamps;

    -- 6. Audit log.
    insert into public.scan_logs (customer_id, kasir_id, action, details)
    values (p_customer_id, p_kasir_id, 'add_stamp', 'Stamp added.');

    v_is_full := (v_max_target is not null and v_current_stamps >= v_max_target);

    return json_build_object(
        'success', true,
        'message', 'Stamp added successfully.',
        'new_stamps', v_current_stamps,
        'card_full', v_is_full,
        -- Kept for response-shape compatibility with the previous engine.
        'reward_earned', false,
        'reward_name', ''
    );
end;
$$ language plpgsql security definer;

-- ==========================================================================
-- redeem_reward_rule — spend stamps against a chosen reward rule
-- ==========================================================================
create or replace function public.redeem_reward_rule(
    p_customer_id uuid,
    p_rule_id uuid,
    p_kasir_id uuid
)
returns json as $$
declare
    v_is_staff boolean;
    v_target integer;
    v_name text;
    v_active boolean;
    v_current integer;
    v_new integer;
begin
    -- 0. Serialize concurrent redemptions for the same customer.
    perform pg_advisory_xact_lock(hashtext(p_customer_id::text));

    -- 1. Security: only active kasir/owner may redeem.
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

    -- 2. Resolve the rule.
    select target_stamps, name, is_active into v_target, v_name, v_active
    from public.reward_rules
    where id = p_rule_id;

    if v_target is null then
        return json_build_object('success', false, 'message', 'Reward not found.');
    end if;

    if not v_active then
        return json_build_object('success', false, 'message', 'Reward is no longer active.');
    end if;

    -- 3. Lock the balance row and check funds.
    select current_stamps into v_current
    from public.loyalty_progress
    where customer_id = p_customer_id
    for update;

    if v_current is null then
        return json_build_object('success', false, 'message', 'Customer progress not found.');
    end if;

    if v_current < v_target then
        return json_build_object(
            'success', false,
            'new_stamps', v_current,
            'message', format('Not enough stamps. Needs %s, has %s.', v_target, v_current)
        );
    end if;

    -- 4. Spend.
    v_new := v_current - v_target;

    update public.loyalty_progress
    set current_stamps = v_new,
        updated_at = now()
    where customer_id = p_customer_id;

    -- 5. Record redemption (history) + audit log.
    insert into public.rewards (customer_id, reward_rule_id, status, used_at, redeemed_by_kasir_id)
    values (p_customer_id, p_rule_id, 'used', now(), p_kasir_id);

    insert into public.scan_logs (customer_id, kasir_id, action, details)
    values (p_customer_id, p_kasir_id, 'redeem_reward', 'Reward redeemed: ' || v_name);

    return json_build_object(
        'success', true,
        'message', 'Reward redeemed successfully.',
        'new_stamps', v_new,
        'reward_name', v_name
    );
end;
$$ language plpgsql security definer;

-- ==========================================================================
-- Seed the two starter reward rules (idempotent; owner-editable afterwards).
-- Requires an existing owner profile for created_by.
-- ==========================================================================
do $$
declare
    v_owner uuid;
begin
    select id into v_owner
    from public.profiles
    where role = 'owner'
    order by created_at asc
    limit 1;

    if v_owner is null then
        raise notice 'No owner profile found; skipping reward-rule seed.';
        return;
    end if;

    if not exists (
        select 1 from public.reward_rules where lower(name) = lower('Ice Shaken Espresso')
    ) then
        insert into public.reward_rules (name, description, target_stamps, is_active, created_by)
        values ('Ice Shaken Espresso', 'Tukarkan 5 stempel', 5, true, v_owner);
    end if;

    if not exists (
        select 1 from public.reward_rules where lower(name) = lower('Locana Coffee')
    ) then
        insert into public.reward_rules (name, description, target_stamps, is_active, created_by)
        values ('Locana Coffee', 'Tukarkan 10 stempel', 10, true, v_owner);
    end if;
end $$;
