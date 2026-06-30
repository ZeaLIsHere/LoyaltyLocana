-- Harden add_stamp against rapid double-submits (slow network + button spam).
--
-- The original cooldown check is read-then-write: two concurrent calls can both
-- read "no recent stamp" before either writes its scan_log, so both add a stamp
-- within the same cooldown window. We add a per-customer transaction-level
-- advisory lock at the top so concurrent calls for the SAME customer serialize;
-- the second call then sees the first's committed scan_log and is rejected by
-- the cooldown. Different customers are unaffected (lock keyed by customer id).

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
    -- 0. Serialize concurrent add_stamp calls for the same customer.
    perform pg_advisory_xact_lock(hashtext(p_customer_id::text));

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
    select id, name, target_stamps into v_rule_id, v_reward_name, v_target_stamps
    from public.reward_rules
    where is_active = true
      and target_stamps <= v_current_stamps
    order by target_stamps desc
    limit 1;

    if v_rule_id is not null then
        insert into public.rewards (customer_id, reward_rule_id, status)
        values (p_customer_id, v_rule_id, 'available');

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
