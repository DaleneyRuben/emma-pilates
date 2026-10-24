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
  ('00000000-0000-0000-0000-000000000001', 'Ana', 'ana-test', now());
INSERT INTO system.accounts (id, email, client_id, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ana@example.com', '00000000-0000-0000-0000-000000000001', now());
INSERT INTO system.accounts (id, email, staff_member_id, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000003', 'admin@example.com', '00000000-0000-0000-0000-000000000001', now());

-- Only a hidden Plan may cost Bs 0, and a free Plan cannot be shown again.
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.plans (id, name, duration_months, class_allowance, price_centavos, display_order, updated_at) VALUES (''00000000-0000-0000-0000-000000000009'', ''Gratis'', 1, 16, 0, 0, now())',
  '23514'
);
INSERT INTO booking.plans (id, name, duration_months, class_allowance, price_centavos, display_order, hidden_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Acceso de prueba', 1, 16, 0, 0, now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'Paquete de 8 clases', 1, 8, 30000, 1, NULL, now());
SELECT pg_temp.expect_failure(
  'UPDATE booking.plans SET hidden_at = NULL WHERE id = ''00000000-0000-0000-0000-000000000001''',
  '23514'
);

-- A courtesy Payment is Bs 0, confirmed by the Administrator who records it.
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.payments (id, client_id, plan_id, plan_name_snapshot, duration_months_snapshot, class_allowance_snapshot, plan_price_centavos, credit_applied_centavos, amount_due_centavos, method, state, submitted_by_account_id, submitted_at, updated_at) VALUES (''00000000-0000-0000-0000-000000000002'', ''00000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000001'', ''Acceso de prueba'', 1, 16, 0, 0, 0, ''courtesy'', ''pending'', ''00000000-0000-0000-0000-000000000003'', now(), now())',
  '23514'
);
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.payments (id, client_id, plan_id, plan_name_snapshot, duration_months_snapshot, class_allowance_snapshot, plan_price_centavos, credit_applied_centavos, amount_due_centavos, method, state, submitted_by_account_id, submitted_at, decided_by_account_id, decided_at, updated_at) VALUES (''00000000-0000-0000-0000-000000000003'', ''00000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000002'', ''Paquete de 8 clases'', 1, 8, 30000, 0, 30000, ''courtesy'', ''confirmed'', ''00000000-0000-0000-0000-000000000003'', now(), ''00000000-0000-0000-0000-000000000003'', now(), now())',
  '23514'
);
-- Bs 0 is never a cash sale.
SELECT pg_temp.expect_failure(
  'INSERT INTO booking.payments (id, client_id, plan_id, plan_name_snapshot, duration_months_snapshot, class_allowance_snapshot, plan_price_centavos, credit_applied_centavos, amount_due_centavos, method, state, collected_at_branch_id, submitted_by_account_id, submitted_at, decided_by_account_id, decided_at, updated_at) VALUES (''00000000-0000-0000-0000-000000000004'', ''00000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000001'', ''Acceso de prueba'', 1, 16, 0, 0, 0, ''cash'', ''confirmed'', ''00000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000003'', now(), ''00000000-0000-0000-0000-000000000003'', now(), now())',
  '23514'
);

INSERT INTO booking.payments (id, client_id, plan_id, plan_name_snapshot, duration_months_snapshot, class_allowance_snapshot, plan_price_centavos, credit_applied_centavos, amount_due_centavos, method, state, submitted_by_account_id, submitted_at, decided_by_account_id, decided_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Acceso de prueba', 1, 16, 0, 0, 0, 'courtesy', 'confirmed', '00000000-0000-0000-0000-000000000003', now(), '00000000-0000-0000-0000-000000000003', now(), now());
INSERT INTO booking.subscriptions (id, client_id, plan_id, payment_id, plan_name_snapshot, duration_months_snapshot, original_class_allowance, remaining_class_allowance, starts_on, ends_on, activated_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Acceso de prueba', 1, 16, 16, '2026-10-23', '2026-11-30', now(), now());

-- The consistent rows above pass every deferred check.
SET CONSTRAINTS ALL IMMEDIATE;
