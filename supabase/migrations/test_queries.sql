-- Locana Database Validation & Verification Queries
-- Copy and paste this script into your Supabase SQL Editor to test the schema, triggers, RLS, and RPCs.

-- ====================================================
-- TEST 1: Cleanup any existing dummy test data
-- ====================================================
delete from auth.users where email in ('owner@test.com', 'kasir@test.com', 'customer@test.com');
delete from public.reward_rules where name = 'Test Free Coffee';

-- ====================================================
-- TEST 2: Simulate User Signup (via auth.users)
-- ====================================================
-- Note: auth.users is owned by supabase auth, we insert with uuid for testing

-- 1. Create Owner User
insert into auth.users (id, email, raw_user_meta_data)
values (
    '11111111-1111-1111-1111-111111111111', 
    'owner@test.com', 
    '{"role": "owner", "full_name": "Cafe Owner"}'::jsonb
);

-- 2. Create Cashier User
insert into auth.users (id, email, raw_user_meta_data)
values (
    '22222222-2222-2222-2222-222222222222', 
    'kasir@test.com', 
    '{"role": "kasir", "full_name": "Cashier Budi"}'::jsonb
);

-- 3. Create Customer User
insert into auth.users (id, email, raw_user_meta_data)
values (
    '33333333-3333-3333-3333-333333333333', 
    'customer@test.com', 
    '{"role": "customer", "full_name": "Customer Andi"}'::jsonb
);

-- Check if triggers automatically created profiles
select * from public.profiles;

-- Check if trigger automatically created loyalty_progress for customer (but NOT for owner/cashier)
select * from public.loyalty_progress;

-- ====================================================
-- TEST 3: Create Reward Rule (Owner Role)
-- ====================================================
-- Set local role or mimic auth context (bypassed here as superuser in SQL editor)
insert into public.reward_rules (id, name, description, target_stamps, created_by)
values (
    '88888888-8888-8888-8888-888888888888',
    'Test Free Coffee',
    'Collect 3 stamps to get a free coffee!',
    3,
    '11111111-1111-1111-1111-111111111111'
);

select * from public.reward_rules;

-- ====================================================
-- TEST 4: Add Stamp - First Stamp
-- ====================================================
-- Mimic cashier session calling add_stamp RPC
-- We set auth.uid() context to Cashier Budi's ID to satisfy the Security Check
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);

-- Call add_stamp for Customer Andi
select public.add_stamp(
    '33333333-3333-3333-3333-333333333333', -- customer_id
    '22222222-2222-2222-2222-222222222222'  -- kasir_id
);

-- Verify stamp added in loyalty progress and logged in scan logs
select * from public.loyalty_progress;
select * from public.scan_logs;

-- ====================================================
-- TEST 5: Add Stamp - Cooldown Check (Should fail)
-- ====================================================
-- Call add_stamp again immediately (within 5 minutes cooldown)
select public.add_stamp(
    '33333333-3333-3333-3333-333333333333', 
    '22222222-2222-2222-2222-222222222222'
);

-- Verify that the rejected log is added but current stamp count remains 1
select * from public.scan_logs order by created_at desc;
select * from public.loyalty_progress;

-- ====================================================
-- TEST 6: Simulate Stamps Accumulation to Target (Reward Trigger)
-- ====================================================
-- Since cooldown prevents us from using add_stamp in quick succession, we bypass it for testing
-- by manually updating current_stamps to 2, then adding the 3rd stamp through the function.
-- (Normally this is disabled via RLS but as superuser we can test the function logic)
update public.loyalty_progress 
set current_stamps = 2 
where customer_id = '33333333-3333-3333-3333-333333333333';

-- Delete previous logs so the 5 minutes cooldown check passes
delete from public.scan_logs where action = 'add_stamp';

-- Call add_stamp for the 3rd stamp (meets rule target_stamps = 3)
select public.add_stamp(
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222'
);

-- Verify:
-- 1. Stamp progress reset (should be 3 - 3 = 0 stamps)
select * from public.loyalty_progress;
-- 2. Reward earned record is created
select * from public.rewards;
-- 3. Log recorded
select * from public.scan_logs order by created_at desc;

-- ====================================================
-- TEST 7: Redeem Reward
-- ====================================================
-- Get the reward ID first (from SELECT) and run the redeem function
declare
    v_reward_id uuid;
begin
    select id into v_reward_id from public.rewards where status = 'available' limit 1;
    
    perform public.redeem_reward(
        v_reward_id,
        '22222222-2222-2222-2222-222222222222' -- kasir_id
    );
end;

-- Verify reward status is now 'used' and has used_at & redeemed_by_kasir_id populated
select * from public.rewards;
select * from public.scan_logs order by created_at desc;
