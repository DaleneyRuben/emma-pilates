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
 ('00000000-0000-0000-0000-000000000001', 'Centro', 'Test address', now()),
 ('00000000-0000-0000-0000-000000000002', 'Norte', 'Test address', now());
INSERT INTO booking.staff_members (id, name, role, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', 'Trainer one', 'trainer', now()),
 ('00000000-0000-0000-0000-000000000002', 'Trainer two', 'trainer', now());
INSERT INTO booking.clients (id, name, referral_code, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', 'Ana', 'ana-test', now());
INSERT INTO system.accounts (id, email, client_id, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', 'ana@example.com', '00000000-0000-0000-0000-000000000001', now());
INSERT INTO booking.plans (id, name, duration_months, class_allowance, price_centavos, display_order, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', 'Paquete de 8 clases', 1, 8, 30000, 0, now());
INSERT INTO booking.class_types (id, name, description, duration_minutes, default_capacity, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', 'Reformer Pilates', 'Pilates con Reformer', 60, 8, now());
INSERT INTO booking.session_schedules (id, branch_id, class_type_id, trainer_staff_member_id, weekday, starts_at_local, capacity, effective_from, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1, '09:00', 8, '2026-09-01', now());
INSERT INTO booking.sessions (id, session_schedule_id, branch_id, class_type_id, trainer_staff_member_id, starts_at, ends_at, capacity, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-09-14 09:00-04', '2026-09-14 10:00-04', 8, now());

-- Invalid scalar values must fail, including null-sensitive state combinations.
SELECT pg_temp.expect_failure('UPDATE booking.plans SET duration_months = 2', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.plans SET class_allowance = 0', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.plans SET price_centavos = -1', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.plans SET display_order = -1', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.plans SET name = ''  ''', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.class_types SET description = ''  ''', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.class_types SET duration_minutes = 0', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.class_types SET default_capacity = 0', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.session_schedules SET weekday = 0', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.session_schedules SET weekday = 8', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.session_schedules SET effective_until = effective_from', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.session_schedules SET capacity = 0', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.sessions SET ends_at = starts_at', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.sessions SET capacity = 0', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.sessions SET state = ''cancelled''', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.sessions SET state = ''cancelled'', cancelled_at = now()', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.sessions SET cancellation_cause = ''zero_bookings''', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.sessions SET state = ''cancelled'', cancelled_at = now(), cancellation_cause = ''no_substitute_trainer''', '23514');

-- Back-to-back Sessions are valid. Overlaps fail for each resource independently.
INSERT INTO booking.sessions (id, branch_id, class_type_id, trainer_staff_member_id, starts_at, ends_at, capacity, is_exception, updated_at)
SELECT '00000000-0000-0000-0000-000000000002', branch_id, class_type_id, trainer_staff_member_id, ends_at, ends_at + interval '1 hour', capacity, true, now() FROM booking.sessions;
SELECT pg_temp.expect_failure('UPDATE booking.sessions SET starts_at = ''2026-09-14 09:30-04'', trainer_staff_member_id = ''00000000-0000-0000-0000-000000000002'' WHERE id = ''00000000-0000-0000-0000-000000000002''', '23P01');
SELECT pg_temp.expect_failure('UPDATE booking.sessions SET starts_at = ''2026-09-14 09:30-04'', branch_id = ''00000000-0000-0000-0000-000000000002'' WHERE id = ''00000000-0000-0000-0000-000000000002''', '23P01');
SELECT pg_temp.expect_failure('UPDATE booking.sessions SET session_schedule_id = ''00000000-0000-0000-0000-000000000001'', starts_at = ''2026-09-14 09:00-04'', state = ''cancelled'', cancelled_at = now(), cancellation_cause = ''zero_bookings'' WHERE id = ''00000000-0000-0000-0000-000000000002''', '23505');
UPDATE booking.sessions SET state = 'cancelled', cancelled_at = now(), cancellation_cause = 'zero_bookings' WHERE id = '00000000-0000-0000-0000-000000000002';
UPDATE booking.sessions SET starts_at = '2026-09-14 09:30-04' WHERE id = '00000000-0000-0000-0000-000000000002';
SELECT pg_temp.expect_failure('UPDATE booking.sessions SET cancelled_by_account_id = ''00000000-0000-0000-0000-000000000001'' WHERE state = ''cancelled''', '23514');
UPDATE booking.sessions SET cancellation_cause = 'no_substitute_trainer', cancelled_by_account_id = '00000000-0000-0000-0000-000000000001' WHERE state = 'cancelled';

INSERT INTO booking.subscriptions (id, client_id, plan_id, plan_name_snapshot, duration_months_snapshot, original_class_allowance, remaining_class_allowance, starts_on, ends_on, activated_at, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Paquete de 8 clases', 1, 8, 8, '2026-01-31', '2026-02-28', '2026-01-31 12:00-04', now());
SELECT pg_temp.expect_failure('UPDATE booking.subscriptions SET remaining_class_allowance = -1', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.subscriptions SET remaining_class_allowance = 9', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.subscriptions SET ends_on = starts_on - 1', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.subscriptions SET state = ''expired''', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.subscriptions SET expired_at = now()', '23514');
SELECT pg_temp.expect_failure('INSERT INTO booking.subscriptions SELECT ''00000000-0000-0000-0000-000000000002'', client_id, plan_id, plan_name_snapshot, duration_months_snapshot, original_class_allowance, remaining_class_allowance, starts_on, ends_on, state, activated_at, expired_at, created_at, updated_at FROM booking.subscriptions', '23505');
UPDATE booking.subscriptions SET state = 'expired', expired_at = now();
INSERT INTO booking.subscriptions SELECT '00000000-0000-0000-0000-000000000002', client_id, plan_id, plan_name_snapshot, duration_months_snapshot, original_class_allowance, remaining_class_allowance, '2026-03-01', '2026-04-01', 'active', now(), NULL, now(), now() FROM booking.subscriptions;
SELECT pg_temp.expect_failure('DELETE FROM booking.plans', '23503');
SELECT pg_temp.expect_failure('DELETE FROM booking.class_types', '23503');
SELECT pg_temp.expect_failure('DELETE FROM booking.session_schedules', '23503');

-- Hiding frees a normalized catalog name but does not rewrite the snapshot.
SELECT pg_temp.expect_failure('INSERT INTO booking.plans SELECT ''00000000-0000-0000-0000-000000000002'', '' paquete de 8 CLASES '', duration_months, class_allowance, price_centavos, display_order, hidden_at, created_at, updated_at FROM booking.plans', '23505');
UPDATE booking.plans SET hidden_at = now();
INSERT INTO booking.plans SELECT '00000000-0000-0000-0000-000000000002', ' paquete de 8 CLASES ', duration_months, class_allowance, price_centavos, display_order, NULL, now(), now() FROM booking.plans;
SELECT pg_temp.expect_failure('UPDATE booking.plans SET hidden_at = NULL', '23505');

INSERT INTO booking.promotions (id, headline, description, display_starts_on, display_ends_on, display_order, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', 'Conoce el estudio', 'Te esperamos', '2026-09-01', '2026-09-30', 0, now());
SELECT pg_temp.expect_failure('UPDATE booking.promotions SET published_at = now()', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.promotions SET display_ends_on = display_starts_on - 1', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.promotions SET display_order = -1', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.promotions SET headline = '' ''', '23514');
INSERT INTO system.image_assets (id, owner_account_id, purpose, pending_object_key, declared_media_type, declared_byte_size, declared_checksum, expires_at) VALUES
 ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'promotion', 'test/image', 'image/jpeg', 100, decode(repeat('00', 32), 'hex'), now() + interval '1 day');
UPDATE booking.promotions SET image_asset_id = '00000000-0000-0000-0000-000000000001', published_at = now();
SELECT pg_temp.expect_failure('UPDATE booking.promotions SET archived_at = now()', '23514');
SELECT pg_temp.expect_failure('UPDATE booking.promotions SET image_asset_id = NULL', '23514');
SELECT pg_temp.expect_failure('DELETE FROM system.image_assets', '23503');
UPDATE booking.promotions SET published_at = NULL, image_asset_id = NULL;
DELETE FROM system.image_assets;
