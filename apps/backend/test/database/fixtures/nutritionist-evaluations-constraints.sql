CREATE FUNCTION pg_temp.expect_failure(statement text, expected_code text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = expected_code THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'Expected SQLSTATE %, but statement succeeded: %', expected_code, statement;
END;
$$;

INSERT INTO booking.branches (id, name, address, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000b01', 'Centro', 'Test address', now()),
  ('00000000-0000-0000-0000-000000000b02', 'Equipetrol', 'Test address', now());
INSERT INTO booking.staff_members (id, name, role, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000a01', 'Carla', 'nutritionist', now()),
  ('00000000-0000-0000-0000-000000000a02', 'Paola', 'nutritionist', now());
INSERT INTO booking.clients (id, name, referral_code, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000c01', 'Ana', 'ana-test', now()),
  ('00000000-0000-0000-0000-000000000c02', 'Lucia', 'lucia-test', now());
INSERT INTO system.accounts (id, email, client_id, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000d01', 'ana@example.com', '00000000-0000-0000-0000-000000000c01', now()),
  ('00000000-0000-0000-0000-000000000d02', 'lucia@example.com', '00000000-0000-0000-0000-000000000c02', now());
INSERT INTO system.accounts (id, email, staff_member_id, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000d03', 'carla@example.com', '00000000-0000-0000-0000-000000000a01', now()),
  ('00000000-0000-0000-0000-000000000d04', 'paola@example.com', '00000000-0000-0000-0000-000000000a02', now());
INSERT INTO booking.plans (id, name, duration_days, class_allowance, price_centavos, display_order, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000e01', 'Paquete de 8 clases', 30, 8, 30000, 0, now());
INSERT INTO booking.subscriptions (id, client_id, plan_id, plan_name_snapshot, duration_days_snapshot, original_class_allowance, remaining_class_allowance, starts_on, ends_on, activated_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000e01', 'Paquete de 8 clases', 30, 8, 8, '2026-09-01', '2026-10-31', now(), now()),
  ('00000000-0000-0000-0000-000000000f02', '00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000e01', 'Paquete de 8 clases', 30, 8, 8, '2026-09-01', '2026-10-31', now(), now());

-- Carla publishes Mondays 09:00-13:00 at Centro and 13:00-14:00 next to it.
INSERT INTO booking.availability_blocks (id, nutritionist_staff_member_id, branch_id, weekday, starts_at_local, ends_at_local, effective_from, created_by_account_id, updated_at) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000b01', 1, '09:00', '13:00', '2026-09-21', '00000000-0000-0000-0000-000000000d03', now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000b01', 1, '13:00', '14:00', '2026-09-21', '00000000-0000-0000-0000-000000000d03', now());
-- Values: weekday, order, minimum length, 15-minute grid, seconds, effective range, end fields.
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.availability_blocks (id, nutritionist_staff_member_id, branch_id, weekday, starts_at_local, ends_at_local, effective_from, created_by_account_id, updated_at) VALUES (gen_random_uuid(), ''00000000-0000-0000-0000-000000000a02'', ''00000000-0000-0000-0000-000000000b01'', 8, ''09:00'', ''10:00'', ''2026-09-21'', ''00000000-0000-0000-0000-000000000d04'', now())',
  '23514'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.availability_blocks (id, nutritionist_staff_member_id, branch_id, weekday, starts_at_local, ends_at_local, effective_from, created_by_account_id, updated_at) VALUES (gen_random_uuid(), ''00000000-0000-0000-0000-000000000a02'', ''00000000-0000-0000-0000-000000000b01'', 2, ''10:00'', ''09:00'', ''2026-09-21'', ''00000000-0000-0000-0000-000000000d04'', now())',
  '23514'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.availability_blocks (id, nutritionist_staff_member_id, branch_id, weekday, starts_at_local, ends_at_local, effective_from, created_by_account_id, updated_at) VALUES (gen_random_uuid(), ''00000000-0000-0000-0000-000000000a02'', ''00000000-0000-0000-0000-000000000b01'', 2, ''09:00'', ''09:30'', ''2026-09-21'', ''00000000-0000-0000-0000-000000000d04'', now())',
  '23514'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.availability_blocks (id, nutritionist_staff_member_id, branch_id, weekday, starts_at_local, ends_at_local, effective_from, created_by_account_id, updated_at) VALUES (gen_random_uuid(), ''00000000-0000-0000-0000-000000000a02'', ''00000000-0000-0000-0000-000000000b01'', 2, ''09:10'', ''10:00'', ''2026-09-21'', ''00000000-0000-0000-0000-000000000d04'', now())',
  '23514'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.availability_blocks (id, nutritionist_staff_member_id, branch_id, weekday, starts_at_local, ends_at_local, effective_from, created_by_account_id, updated_at) VALUES (gen_random_uuid(), ''00000000-0000-0000-0000-000000000a02'', ''00000000-0000-0000-0000-000000000b01'', 2, ''09:00:30'', ''10:00'', ''2026-09-21'', ''00000000-0000-0000-0000-000000000d04'', now())',
  '23514'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.availability_blocks (id, nutritionist_staff_member_id, branch_id, weekday, starts_at_local, ends_at_local, effective_from, effective_until, created_by_account_id, ended_by_account_id, ended_at, updated_at) VALUES (gen_random_uuid(), ''00000000-0000-0000-0000-000000000a02'', ''00000000-0000-0000-0000-000000000b01'', 2, ''09:00'', ''10:00'', ''2026-09-21'', ''2026-09-20'', ''00000000-0000-0000-0000-000000000d04'', ''00000000-0000-0000-0000-000000000d04'', now(), now())',
  '23514'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.availability_blocks (id, nutritionist_staff_member_id, branch_id, weekday, starts_at_local, ends_at_local, effective_from, effective_until, created_by_account_id, updated_at) VALUES (gen_random_uuid(), ''00000000-0000-0000-0000-000000000a02'', ''00000000-0000-0000-0000-000000000b01'', 2, ''09:00'', ''10:00'', ''2026-09-21'', ''2026-10-21'', ''00000000-0000-0000-0000-000000000d04'', now())',
  '23514'
);
-- One Nutritionist, one place: overlapping weekly ranges fail even at another Branch.
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.availability_blocks (id, nutritionist_staff_member_id, branch_id, weekday, starts_at_local, ends_at_local, effective_from, created_by_account_id, updated_at) VALUES (gen_random_uuid(), ''00000000-0000-0000-0000-000000000a01'', ''00000000-0000-0000-0000-000000000b02'', 1, ''12:00'', ''15:00'', ''2026-10-05'', ''00000000-0000-0000-0000-000000000d03'', now())',
  '23P01'
);
-- An empty effective range overlaps nothing; another Nutritionist may overlap.
INSERT INTO booking.availability_blocks (id, nutritionist_staff_member_id, branch_id, weekday, starts_at_local, ends_at_local, effective_from, effective_until, created_by_account_id, ended_by_account_id, ended_at, updated_at) VALUES
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000b02', 1, '09:00', '10:00', '2026-10-05', '2026-10-05', '00000000-0000-0000-0000-000000000d03', '00000000-0000-0000-0000-000000000d03', now(), now());
INSERT INTO booking.availability_blocks (id, nutritionist_staff_member_id, branch_id, weekday, starts_at_local, ends_at_local, effective_from, created_by_account_id, updated_at) VALUES
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000a02', '00000000-0000-0000-0000-000000000b01', 1, '09:00', '13:00', '2026-09-21', '00000000-0000-0000-0000-000000000d04', now());
-- The definition is immutable; the end is set once and may only move earlier.
SELECT pg_temp.expect_failure(
  'UPDATE booking.availability_blocks SET weekday = 2 WHERE id = ''10000000-0000-0000-0000-000000000001''',
  '55000'
);
UPDATE booking.availability_blocks
  SET effective_until = '2026-12-07', ended_at = now(), ended_by_account_id = '00000000-0000-0000-0000-000000000d04'
  WHERE id = '10000000-0000-0000-0000-000000000004';
UPDATE booking.availability_blocks SET effective_until = '2026-11-30'
  WHERE id = '10000000-0000-0000-0000-000000000004';
SELECT pg_temp.expect_failure(
  'UPDATE booking.availability_blocks SET effective_until = ''2026-12-14'' WHERE id = ''10000000-0000-0000-0000-000000000004''',
  '55000'
);
SELECT pg_temp.expect_failure(
  'DELETE FROM booking.availability_blocks WHERE id = ''10000000-0000-0000-0000-000000000004''',
  '55000'
);

-- Monday 2026-09-28 09:00 Bolivia and Wednesday 2026-09-30 23:15 Bolivia (a September slot stored on October 1 UTC).
INSERT INTO booking.evaluation_slots (id, availability_block_id, nutritionist_staff_member_id, branch_id, starts_at, ends_at, local_month, updated_at) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000b01', '2026-09-28T13:00:00Z', '2026-09-28T13:45:00Z', '2026-09-01', now()),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000b01', '2026-10-01T03:15:00Z', '2026-10-01T04:00:00Z', '2026-09-01', now());
-- Values: fixed length, Bolivia month, source copies, and withdrawal evidence.
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.evaluation_slots (id, availability_block_id, nutritionist_staff_member_id, branch_id, starts_at, ends_at, local_month, updated_at) VALUES (gen_random_uuid(), ''10000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000a01'', ''00000000-0000-0000-0000-000000000b01'', ''2026-10-05T13:00:00Z'', ''2026-10-05T14:00:00Z'', ''2026-10-01'', now())',
  '23514'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.evaluation_slots (id, availability_block_id, nutritionist_staff_member_id, branch_id, starts_at, ends_at, local_month, updated_at) VALUES (gen_random_uuid(), ''10000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000a01'', ''00000000-0000-0000-0000-000000000b01'', ''2026-11-01T03:15:00Z'', ''2026-11-01T04:00:00Z'', ''2026-11-01'', now())',
  '23514'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.evaluation_slots (id, availability_block_id, nutritionist_staff_member_id, branch_id, starts_at, ends_at, local_month, updated_at) VALUES (gen_random_uuid(), ''10000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000a01'', ''00000000-0000-0000-0000-000000000b02'', ''2026-10-05T13:00:00Z'', ''2026-10-05T13:45:00Z'', ''2026-10-01'', now())',
  '23503'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.evaluation_slots (id, availability_block_id, nutritionist_staff_member_id, branch_id, starts_at, ends_at, local_month, state, updated_at) VALUES (gen_random_uuid(), ''10000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000a01'', ''00000000-0000-0000-0000-000000000b01'', ''2026-10-05T13:00:00Z'', ''2026-10-05T13:45:00Z'', ''2026-10-01'', ''withdrawn'', now())',
  '23514'
);
-- Published slots of one Nutritionist never overlap; withdrawn ones may; one row per source and start.
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.evaluation_slots (id, availability_block_id, nutritionist_staff_member_id, branch_id, starts_at, ends_at, local_month, updated_at) VALUES (gen_random_uuid(), ''10000000-0000-0000-0000-000000000002'', ''00000000-0000-0000-0000-000000000a01'', ''00000000-0000-0000-0000-000000000b01'', ''2026-09-28T13:30:00Z'', ''2026-09-28T14:15:00Z'', ''2026-09-01'', now())',
  '23P01'
);
INSERT INTO booking.evaluation_slots (id, availability_block_id, nutritionist_staff_member_id, branch_id, starts_at, ends_at, local_month, state, withdrawn_at, updated_at) VALUES
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000b01', '2026-09-28T13:30:00Z', '2026-09-28T14:15:00Z', '2026-09-01', 'withdrawn', now(), now());
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.evaluation_slots (id, availability_block_id, nutritionist_staff_member_id, branch_id, starts_at, ends_at, local_month, state, withdrawn_at, updated_at) VALUES (gen_random_uuid(), ''10000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000a01'', ''00000000-0000-0000-0000-000000000b01'', ''2026-09-28T13:00:00Z'', ''2026-09-28T13:45:00Z'', ''2026-09-01'', ''withdrawn'', now(), now())',
  '23505'
);
-- An occurrence never moves, and a withdrawal is final.
SELECT pg_temp.expect_failure(
  'UPDATE booking.evaluation_slots SET starts_at = ''2026-09-28T13:15:00Z'', ends_at = ''2026-09-28T14:00:00Z'' WHERE id = ''20000000-0000-0000-0000-000000000001''',
  '55000'
);
SELECT pg_temp.expect_failure(
  'UPDATE booking.evaluation_slots SET state = ''published'', withdrawn_at = NULL WHERE id = ''20000000-0000-0000-0000-000000000003''',
  '55000'
);

-- Ana books the Monday slot for September with her Subscription.
INSERT INTO booking.evaluations (id, client_id, evaluation_slot_id, eligibility_month, subscription_id, created_by_account_id, updated_at) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000c01', '20000000-0000-0000-0000-000000000001', '2026-09-01', '00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-000000000d01', now());
-- The month is the slot's; the Subscription is the Client's; cancellation fields match the state.
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.evaluations (id, client_id, evaluation_slot_id, eligibility_month, subscription_id, created_by_account_id, updated_at) VALUES (gen_random_uuid(), ''00000000-0000-0000-0000-000000000c02'', ''20000000-0000-0000-0000-000000000002'', ''2026-10-01'', ''00000000-0000-0000-0000-000000000f02'', ''00000000-0000-0000-0000-000000000d02'', now())',
  '23503'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.evaluations (id, client_id, evaluation_slot_id, eligibility_month, subscription_id, created_by_account_id, updated_at) VALUES (gen_random_uuid(), ''00000000-0000-0000-0000-000000000c02'', ''20000000-0000-0000-0000-000000000002'', ''2026-09-01'', ''00000000-0000-0000-0000-000000000f01'', ''00000000-0000-0000-0000-000000000d02'', now())',
  '23503'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.evaluations (id, client_id, evaluation_slot_id, eligibility_month, subscription_id, created_by_account_id, cancelled_at, updated_at) VALUES (gen_random_uuid(), ''00000000-0000-0000-0000-000000000c02'', ''20000000-0000-0000-0000-000000000002'', ''2026-09-01'', ''00000000-0000-0000-0000-000000000f02'', ''00000000-0000-0000-0000-000000000d02'', now(), now())',
  '23514'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.evaluations (id, client_id, evaluation_slot_id, eligibility_month, subscription_id, state, created_by_account_id, cancelled_at, cancelled_by_account_id, updated_at) VALUES (gen_random_uuid(), ''00000000-0000-0000-0000-000000000c02'', ''20000000-0000-0000-0000-000000000002'', ''2026-09-01'', ''00000000-0000-0000-0000-000000000f02'', ''cancelled'', ''00000000-0000-0000-0000-000000000d02'', now(), ''00000000-0000-0000-0000-000000000d02'', now())',
  '23514'
);
-- One booked Evaluation per slot and one per Client per Bolivia month.
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.evaluations (id, client_id, evaluation_slot_id, eligibility_month, subscription_id, created_by_account_id, updated_at) VALUES (gen_random_uuid(), ''00000000-0000-0000-0000-000000000c02'', ''20000000-0000-0000-0000-000000000001'', ''2026-09-01'', ''00000000-0000-0000-0000-000000000f02'', ''00000000-0000-0000-0000-000000000d02'', now())',
  '23505'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.evaluations (id, client_id, evaluation_slot_id, eligibility_month, subscription_id, created_by_account_id, updated_at) VALUES (gen_random_uuid(), ''00000000-0000-0000-0000-000000000c01'', ''20000000-0000-0000-0000-000000000002'', ''2026-09-01'', ''00000000-0000-0000-0000-000000000f01'', ''00000000-0000-0000-0000-000000000d01'', now())',
  '23505'
);
-- Cross-table guards: a booked slot cannot be withdrawn; a withdrawn slot cannot be booked.
SELECT pg_temp.expect_failure(
  'UPDATE booking.evaluation_slots SET state = ''withdrawn'', withdrawn_at = now() WHERE id = ''20000000-0000-0000-0000-000000000001''',
  '55000'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.evaluations (id, client_id, evaluation_slot_id, eligibility_month, subscription_id, created_by_account_id, updated_at) VALUES (gen_random_uuid(), ''00000000-0000-0000-0000-000000000c02'', ''20000000-0000-0000-0000-000000000003'', ''2026-09-01'', ''00000000-0000-0000-0000-000000000f02'', ''00000000-0000-0000-0000-000000000d02'', now())',
  '55000'
);
-- The reservation is immutable; each reminder marker is set once.
SELECT pg_temp.expect_failure(
  'UPDATE booking.evaluations SET client_id = ''00000000-0000-0000-0000-000000000c02'', subscription_id = ''00000000-0000-0000-0000-000000000f02'' WHERE id = ''30000000-0000-0000-0000-000000000001''',
  '55000'
);
UPDATE booking.evaluations SET day_reminder_recorded_at = now()
  WHERE id = '30000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect_failure(
  'UPDATE booking.evaluations SET day_reminder_recorded_at = now() + interval ''1 minute'' WHERE id = ''30000000-0000-0000-0000-000000000001''',
  '55000'
);
-- Cancelling frees both the slot and the month, and the cancellation is final.
UPDATE booking.evaluations
  SET state = 'cancelled', cancelled_at = now(), cancelled_by_account_id = '00000000-0000-0000-0000-000000000d01', cancellation_cause = 'client_request'
  WHERE id = '30000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect_failure(
  'UPDATE booking.evaluations SET state = ''booked'', cancelled_at = NULL, cancelled_by_account_id = NULL, cancellation_cause = NULL WHERE id = ''30000000-0000-0000-0000-000000000001''',
  '55000'
);
INSERT INTO booking.evaluations (id, client_id, evaluation_slot_id, eligibility_month, subscription_id, created_by_account_id, updated_at) VALUES
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000c02', '20000000-0000-0000-0000-000000000001', '2026-09-01', '00000000-0000-0000-0000-000000000f02', '00000000-0000-0000-0000-000000000d02', now()),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000c01', '20000000-0000-0000-0000-000000000002', '2026-09-01', '00000000-0000-0000-0000-000000000f01', '00000000-0000-0000-0000-000000000d01', now());
SELECT pg_temp.expect_failure(
  'DELETE FROM booking.evaluations WHERE id = ''30000000-0000-0000-0000-000000000001''',
  '55000'
);
SELECT pg_temp.expect_failure(
  'DELETE FROM booking.evaluation_slots WHERE id = ''20000000-0000-0000-0000-000000000003''',
  '55000'
);
