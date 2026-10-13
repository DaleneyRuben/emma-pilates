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

CREATE FUNCTION pg_temp.expect_equal(actual bigint, expected bigint, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION '%: expected %, got %', label, expected, actual;
  END IF;
END;
$$;

INSERT INTO booking.branches (id, name, address, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', 'Centro', 'Test address', now()),
 ('00000000-0000-0000-0000-000000000002', 'Norte', 'Test address', now());
INSERT INTO booking.staff_members (id, name, role, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', 'Paola', 'administrator', now()),
 ('00000000-0000-0000-0000-000000000002', 'Emma', 'trainer', now());
INSERT INTO system.accounts (id, email, staff_member_id, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', 'paola@example.com', '00000000-0000-0000-0000-000000000001', now());

-- Supplies
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.supplies (id, branch_id, name, initial_quantity, quantity_on_hand, low_stock_threshold, created_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '  ', 10, 10, 2, '00000000-0000-0000-0000-000000000001', now())$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.supplies (id, branch_id, name, initial_quantity, quantity_on_hand, low_stock_threshold, created_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Papel', -1, -1, 2, '00000000-0000-0000-0000-000000000001', now())$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.supplies (id, branch_id, name, initial_quantity, quantity_on_hand, low_stock_threshold, created_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Papel', 10, 10, -1, '00000000-0000-0000-0000-000000000001', now())$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.supplies (id, branch_id, name, initial_quantity, quantity_on_hand, low_stock_threshold, created_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Papel', 10, 12, 2, '00000000-0000-0000-0000-000000000001', now())$q$, '23514');
INSERT INTO back_office.supplies (id, branch_id, name, initial_quantity, quantity_on_hand, low_stock_threshold, created_by_account_id, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Papel higiénico', 10, 10, 4, '00000000-0000-0000-0000-000000000001', now());
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.supplies (id, branch_id, name, initial_quantity, quantity_on_hand, low_stock_threshold, created_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', ' PAPEL higiénico ', 3, 3, 1, '00000000-0000-0000-0000-000000000001', now())$q$, '23505');
INSERT INTO back_office.supplies (id, branch_id, name, initial_quantity, quantity_on_hand, low_stock_threshold, created_by_account_id, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Papel higiénico', 0, 0, 0, '00000000-0000-0000-0000-000000000001', now());
SELECT pg_temp.expect_failure($q$UPDATE back_office.supplies SET quantity_on_hand = 50 WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '55000');
SELECT pg_temp.expect_failure($q$UPDATE back_office.supplies SET branch_id = '00000000-0000-0000-0000-000000000002' WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '55000');
SELECT pg_temp.expect_failure($q$UPDATE back_office.supplies SET initial_quantity = 20 WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '55000');
SELECT pg_temp.expect_failure($q$DELETE FROM back_office.supplies WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '55000');
UPDATE back_office.supplies SET name = 'Papel higiénico doble hoja', low_stock_threshold = 3 WHERE id = '00000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect_failure($q$DELETE FROM booking.branches WHERE id = '00000000-0000-0000-0000-000000000002'$q$, '23001');

-- Withdrawals and Restocks
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.withdrawals (id, supply_id, quantity, recorded_by_account_id) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 0, '00000000-0000-0000-0000-000000000001')$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.withdrawals (id, supply_id, quantity, recorded_by_account_id) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 11, '00000000-0000-0000-0000-000000000001')$q$, '23514');
SELECT pg_temp.expect_equal((SELECT quantity_on_hand FROM back_office.supplies WHERE id = '00000000-0000-0000-0000-000000000001'), 10, 'stock after rejected withdrawal');
SELECT pg_temp.expect_equal((SELECT count(*) FROM back_office.withdrawals), 0, 'withdrawals after rejection');
INSERT INTO back_office.withdrawals (id, supply_id, quantity, recorded_by_account_id) VALUES
 ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 3, '00000000-0000-0000-0000-000000000001');
SELECT pg_temp.expect_equal((SELECT quantity_on_hand FROM back_office.supplies WHERE id = '00000000-0000-0000-0000-000000000001'), 7, 'stock after withdrawal');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.supply_restocks (id, supply_id, quantity, recorded_by_account_id) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', -2, '00000000-0000-0000-0000-000000000001')$q$, '23514');
INSERT INTO back_office.supply_restocks (id, supply_id, quantity, recorded_by_account_id) VALUES
 ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 5, '00000000-0000-0000-0000-000000000001');
INSERT INTO back_office.withdrawals (id, supply_id, quantity, recorded_by_account_id) VALUES
 ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 12, '00000000-0000-0000-0000-000000000001');
SELECT pg_temp.expect_equal((SELECT quantity_on_hand FROM back_office.supplies WHERE id = '00000000-0000-0000-0000-000000000001'), 0, 'stock withdrawn to exactly zero');
SELECT pg_temp.expect_equal((
  SELECT s.initial_quantity
       + coalesce((SELECT sum(quantity) FROM back_office.supply_restocks r WHERE r.supply_id = s.id), 0)
       - coalesce((SELECT sum(quantity) FROM back_office.withdrawals w WHERE w.supply_id = s.id), 0)
       - s.quantity_on_hand
  FROM back_office.supplies s WHERE s.id = '00000000-0000-0000-0000-000000000001'), 0, 'stock reconciles with movements');
SELECT pg_temp.expect_failure($q$UPDATE back_office.withdrawals SET quantity = 1$q$, '55000');
SELECT pg_temp.expect_failure($q$DELETE FROM back_office.withdrawals$q$, '55000');
SELECT pg_temp.expect_failure($q$UPDATE back_office.supply_restocks SET quantity = 1$q$, '55000');
SELECT pg_temp.expect_failure($q$DELETE FROM back_office.supply_restocks$q$, '55000');
UPDATE back_office.supplies SET archived_at = now() WHERE id = '00000000-0000-0000-0000-000000000002';
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.supply_restocks (id, supply_id, quantity, recorded_by_account_id) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 1, '00000000-0000-0000-0000-000000000001')$q$, '55000');
SELECT pg_temp.expect_failure($q$UPDATE back_office.supplies SET archived_at = NULL WHERE id = '00000000-0000-0000-0000-000000000002'$q$, '55000');
INSERT INTO back_office.supplies (id, branch_id, name, initial_quantity, quantity_on_hand, low_stock_threshold, created_by_account_id, updated_at) VALUES
 (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 'papel higiénico', 6, 6, 2, '00000000-0000-0000-0000-000000000001', now());

-- Salary Payments
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.salary_payments (id, staff_member_id, amount_centavos, paid_on, recorded_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 0, '2026-09-30', '00000000-0000-0000-0000-000000000001', now())$q$, '23514');
INSERT INTO back_office.salary_payments (id, staff_member_id, amount_centavos, paid_on, recorded_by_account_id, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 350000, '2026-09-30', '00000000-0000-0000-0000-000000000001', now());
UPDATE back_office.salary_payments SET amount_centavos = 360000, paid_on = '2026-10-01', staff_member_id = '00000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect_failure($q$UPDATE back_office.salary_payments SET amount_centavos = -1$q$, '23514');
SELECT pg_temp.expect_failure($q$UPDATE back_office.salary_payments SET created_at = created_at - interval '1 day'$q$, '55000');
SELECT pg_temp.expect_failure($q$DELETE FROM back_office.salary_payments$q$, '55000');
SELECT pg_temp.expect_failure($q$DELETE FROM system.accounts$q$, '23001');

-- Expense Categories and Expenses
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.expense_categories (id, name, updated_at) VALUES (gen_random_uuid(), '', now())$q$, '23514');
INSERT INTO back_office.expense_categories (id, name, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', 'Mantenimiento', now()),
 ('00000000-0000-0000-0000-000000000002', 'Reparación', now()),
 ('00000000-0000-0000-0000-000000000003', 'Limpieza', now());
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.expense_categories (id, name, updated_at) VALUES (gen_random_uuid(), ' mantenimiento ', now())$q$, '23505');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.expenses (id, branch_id, expense_category_id, amount_centavos, incurred_on, recorded_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', -500, '2026-09-15', '00000000-0000-0000-0000-000000000001', now())$q$, '23514');
INSERT INTO back_office.expenses (id, branch_id, expense_category_id, amount_centavos, incurred_on, recorded_by_account_id, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 45050, '2026-09-15', '00000000-0000-0000-0000-000000000001', now());
UPDATE back_office.expenses SET expense_category_id = '00000000-0000-0000-0000-000000000002', amount_centavos = 47000, incurred_on = '2026-09-16';
SELECT pg_temp.expect_failure($q$UPDATE back_office.expenses SET branch_id = '00000000-0000-0000-0000-000000000002'$q$, '55000');
SELECT pg_temp.expect_failure($q$DELETE FROM back_office.expenses$q$, '55000');
SELECT pg_temp.expect_failure($q$DELETE FROM back_office.expense_categories WHERE id = '00000000-0000-0000-0000-000000000002'$q$, '23001');
DELETE FROM back_office.expense_categories WHERE id = '00000000-0000-0000-0000-000000000003';
SELECT pg_temp.expect_failure($q$DELETE FROM booking.branches WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '23001');
