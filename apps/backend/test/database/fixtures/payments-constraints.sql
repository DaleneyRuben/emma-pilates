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
  ('00000000-0000-0000-0000-000000000001', 'Admin', 'administrator', now());
INSERT INTO booking.clients (id, name, referral_code, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Ana', 'ana-test', now()),
  ('00000000-0000-0000-0000-000000000002', 'Lucia', 'lucia-test', now());
INSERT INTO system.accounts (id, email, client_id, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ana@example.com', '00000000-0000-0000-0000-000000000001', now()),
  ('00000000-0000-0000-0000-000000000002', 'lucia@example.com', '00000000-0000-0000-0000-000000000002', now());
INSERT INTO system.accounts (id, email, staff_member_id, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000003', 'admin@example.com', '00000000-0000-0000-0000-000000000001', now());
INSERT INTO booking.plans (id, name, duration_days, class_allowance, price_centavos, display_order, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Paquete de 8 clases', 30, 8, 30000, 0, now());

-- One open Purchase Intent per Client; amounts and snapshots are checked and frozen.
INSERT INTO booking.purchase_intents (id, client_id, plan_id, plan_name_snapshot, duration_days_snapshot, class_allowance_snapshot, plan_price_centavos, credit_reserved_centavos, amount_due_centavos, created_by_account_id, expires_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Paquete de 8 clases', 30, 8, 30000, 6000, 24000, '00000000-0000-0000-0000-000000000001', now() + interval '24 hours', now());
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.purchase_intents (id, client_id, plan_id, plan_name_snapshot, duration_days_snapshot, class_allowance_snapshot, plan_price_centavos, credit_reserved_centavos, amount_due_centavos, created_by_account_id, expires_at, updated_at) VALUES (''00000000-0000-0000-0000-000000000002'', ''00000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000001'', ''Paquete de 8 clases'', 30, 8, 30000, 0, 30000, ''00000000-0000-0000-0000-000000000001'', now() + interval ''24 hours'', now())',
  '23505'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.purchase_intents (id, client_id, plan_id, plan_name_snapshot, duration_days_snapshot, class_allowance_snapshot, plan_price_centavos, credit_reserved_centavos, amount_due_centavos, created_by_account_id, expires_at, updated_at) VALUES (''00000000-0000-0000-0000-000000000003'', ''00000000-0000-0000-0000-000000000002'', ''00000000-0000-0000-0000-000000000001'', ''Paquete de 8 clases'', 30, 8, 30000, 6000, 30000, ''00000000-0000-0000-0000-000000000002'', now() + interval ''24 hours'', now())',
  '23514'
);
SELECT pg_temp.expect_failure(
  'UPDATE booking.purchase_intents SET plan_price_centavos = 25000, amount_due_centavos = 19000 WHERE id = ''00000000-0000-0000-0000-000000000001''',
  '55000'
);

-- The reserved Credit of that Intent: one Reservation with exactly one reservation entry.
INSERT INTO booking.credit_reservations (id, client_id, amount_centavos, purchase_intent_id, reserved_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 6000, '00000000-0000-0000-0000-000000000001', now(), now());
INSERT INTO booking.credit_ledger_entries (id, client_id, kind, amount_centavos, reservation_id, actor_kind, actor_account_id, correlation_id) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'payment_reservation', 6000, '00000000-0000-0000-0000-000000000001', 'account', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101');
SELECT pg_temp.expect_failure(
  'UPDATE booking.credit_ledger_entries SET amount_centavos = 1 WHERE id = ''00000000-0000-0000-0000-000000000001''',
  '55000'
);
SELECT pg_temp.expect_failure(
  'DELETE FROM booking.credit_ledger_entries WHERE id = ''00000000-0000-0000-0000-000000000001''',
  '55000'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.credit_reservations (id, client_id, amount_centavos, reserved_at, updated_at) VALUES (''00000000-0000-0000-0000-000000000002'', ''00000000-0000-0000-0000-000000000002'', 1000, now(), now())',
  '23514'
);

-- A confirmed cash Payment activates exactly one Subscription; its decision is final.
INSERT INTO booking.payments (id, client_id, plan_id, plan_name_snapshot, duration_days_snapshot, class_allowance_snapshot, plan_price_centavos, credit_applied_centavos, amount_due_centavos, method, state, collected_at_branch_id, submitted_by_account_id, submitted_at, decided_by_account_id, decided_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Paquete de 8 clases', 30, 8, 30000, 0, 30000, 'cash', 'confirmed', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', now(), '00000000-0000-0000-0000-000000000003', now(), now());
INSERT INTO booking.subscriptions (id, client_id, plan_id, payment_id, plan_name_snapshot, duration_days_snapshot, original_class_allowance, remaining_class_allowance, starts_on, ends_on, activated_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Paquete de 8 clases', 30, 8, 8, '2026-09-22', '2026-10-22', now(), now());
SELECT pg_temp.expect_failure(
  'UPDATE booking.payments SET state = ''rejected'', rejection_reason = ''late'' WHERE id = ''00000000-0000-0000-0000-000000000001''',
  '55000'
);
SELECT pg_temp.expect_failure(
  'UPDATE booking.payments SET duration_days_snapshot = 60 WHERE id = ''00000000-0000-0000-0000-000000000001''',
  '55000'
);
SELECT pg_temp.expect_failure(
  'UPDATE booking.payments SET duration_days_snapshot = 60, weekly_class_cap_snapshot = 3 WHERE id = ''00000000-0000-0000-0000-000000000001''',
  '55000'
);
SELECT pg_temp.expect_failure(
  'UPDATE booking.purchase_intents SET duration_days_snapshot = 90 WHERE id = ''00000000-0000-0000-0000-000000000001''',
  '55000'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.payments (id, client_id, plan_id, purchase_intent_id, plan_name_snapshot, duration_days_snapshot, class_allowance_snapshot, plan_price_centavos, credit_applied_centavos, amount_due_centavos, method, state, collected_at_branch_id, submitted_by_account_id, submitted_at, decided_by_account_id, decided_at, updated_at) VALUES (''00000000-0000-0000-0000-000000000002'', ''00000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000001'', ''Paquete de 8 clases'', 30, 8, 30000, 0, 30000, ''cash'', ''confirmed'', ''00000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000003'', now(), ''00000000-0000-0000-0000-000000000003'', now(), now())',
  '23514'
);
-- A transfer Payment cannot borrow another Client's Purchase Intent.
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.payments (id, client_id, plan_id, purchase_intent_id, plan_name_snapshot, duration_days_snapshot, class_allowance_snapshot, plan_price_centavos, credit_applied_centavos, amount_due_centavos, method, state, submitted_by_account_id, submitted_at, updated_at) VALUES (''00000000-0000-0000-0000-000000000002'', ''00000000-0000-0000-0000-000000000002'', ''00000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000001'', ''Paquete de 8 clases'', 30, 8, 30000, 6000, 24000, ''transfer'', ''pending'', ''00000000-0000-0000-0000-000000000002'', now(), now())',
  '23503'
);

-- Referral attribution: never self-referential, one referrer per referred Client.
INSERT INTO booking.referrals (id, referrer_client_id, referred_client_id) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.referrals (id, referrer_client_id, referred_client_id) VALUES (''00000000-0000-0000-0000-000000000002'', ''00000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000001'')',
  '23514'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.referrals (id, referrer_client_id, referred_client_id) VALUES (''00000000-0000-0000-0000-000000000003'', ''00000000-0000-0000-0000-000000000002'', ''00000000-0000-0000-0000-000000000002'')',
  '23514'
);

-- Deferred commit-time check: a confirmed Payment without its Subscription is rejected.
SAVEPOINT orphan_payment;
INSERT INTO booking.payments (id, client_id, plan_id, plan_name_snapshot, duration_days_snapshot, class_allowance_snapshot, plan_price_centavos, credit_applied_centavos, amount_due_centavos, method, state, submitted_by_account_id, submitted_at, decided_by_account_id, decided_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Paquete de 8 clases', 30, 8, 30000, 30000, 0, 'credit_only', 'confirmed', '00000000-0000-0000-0000-000000000001', now(), '00000000-0000-0000-0000-000000000001', now(), now());
SELECT pg_temp.expect_failure('SET CONSTRAINTS ALL IMMEDIATE', '23514');
ROLLBACK TO SAVEPOINT orphan_payment;

-- The consistent rows above pass every deferred check.
SET CONSTRAINTS ALL IMMEDIATE;
