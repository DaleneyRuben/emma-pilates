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
  ('00000000-0000-0000-0000-000000000001', 'Centro', 'Test address', now());
INSERT INTO booking.staff_members (id, name, role, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Trainer', 'trainer', now());
INSERT INTO booking.clients (id, name, referral_code, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Ana', 'ana-test', now()),
  ('00000000-0000-0000-0000-000000000002', 'Lucia', 'lucia-test', now());
INSERT INTO system.accounts (id, email, client_id, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ana@example.com', '00000000-0000-0000-0000-000000000001', now()),
  ('00000000-0000-0000-0000-000000000002', 'lucia@example.com', '00000000-0000-0000-0000-000000000002', now());
INSERT INTO system.accounts (id, email, staff_member_id, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000003', 'trainer@example.com', '00000000-0000-0000-0000-000000000001', now());
INSERT INTO booking.plans (id, name, duration_days, class_allowance, price_centavos, display_order, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Paquete de 8 clases', 30, 8, 30000, 0, now());
INSERT INTO booking.class_types (id, name, description, duration_minutes, default_capacity, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Reformer Pilates', 'Pilates con Reformer', 60, 8, now());
INSERT INTO booking.sessions (id, branch_id, class_type_id, trainer_staff_member_id, starts_at, ends_at, capacity, is_exception, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-09-14 09:00-04', '2026-09-14 10:00-04', 8, true, now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-09-14 10:00-04', '2026-09-14 11:00-04', 8, true, now());
INSERT INTO booking.subscriptions (id, client_id, plan_id, plan_name_snapshot, duration_days_snapshot, original_class_allowance, remaining_class_allowance, starts_on, ends_on, activated_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Paquete de 8 clases', 30, 8, 8, '2026-09-01', '2026-09-30', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Paquete de 8 clases', 30, 8, 8, '2026-09-01', '2026-09-30', now(), now());

INSERT INTO booking.bookings (id, session_id, client_id, subscription_id, created_by_account_id, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now());

SELECT pg_temp.expect_failure(
  'INSERT INTO booking.bookings (id, session_id, client_id, subscription_id, created_by_account_id, updated_at) VALUES (''00000000-0000-0000-0000-000000000002'', ''00000000-0000-0000-0000-000000000002'', ''00000000-0000-0000-0000-000000000002'', ''00000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000002'', now())',
  '23503'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.bookings (id, session_id, client_id, subscription_id, created_by_account_id, updated_at) VALUES (''00000000-0000-0000-0000-000000000003'', ''00000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000001'', now())',
  '23505'
);
SELECT pg_temp.expect_failure(
  'UPDATE booking.bookings SET state = ''cancelled'' WHERE id = ''00000000-0000-0000-0000-000000000001''',
  '23514'
);

INSERT INTO booking.bookings (id, session_id, client_id, subscription_id, created_by_account_id, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now()),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', now());
SELECT pg_temp.expect_failure(
  'UPDATE booking.bookings SET state = ''rescheduled'', rescheduled_to_booking_id = ''00000000-0000-0000-0000-000000000005'', rescheduled_at = now(), rescheduled_by_account_id = ''00000000-0000-0000-0000-000000000001'' WHERE id = ''00000000-0000-0000-0000-000000000004''',
  '23503'
);

INSERT INTO booking.waitlist_entries (id, session_id, client_id, joined_by_account_id) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002');
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.waitlist_entries (id, session_id, client_id, joined_by_account_id) VALUES (''00000000-0000-0000-0000-000000000002'', ''00000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000002'', ''00000000-0000-0000-0000-000000000002'')',
  '23505'
);
SELECT pg_temp.expect_failure(
  'UPDATE booking.waitlist_entries SET closure_reason = ''left'' WHERE id = ''00000000-0000-0000-0000-000000000001''',
  '23514'
);
SELECT pg_temp.expect_failure(
  'UPDATE booking.waitlist_entries SET closed_at = now(), closure_reason = ''promoted'', promoted_booking_id = ''00000000-0000-0000-0000-000000000004'' WHERE id = ''00000000-0000-0000-0000-000000000001''',
  '23503'
);

INSERT INTO booking.attendance_records (booking_id, outcome, recorded_by_account_id, recorded_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000004', 'attended', '00000000-0000-0000-0000-000000000003', now(), now());
SELECT pg_temp.expect_failure(
  'UPDATE booking.attendance_records SET updated_at = recorded_at - interval ''1 second''',
  '23514'
);
