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
 ('00000000-0000-0000-0000-000000000001', 'Paola', 'administrator', now());
INSERT INTO system.accounts (id, email, staff_member_id, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', 'paola@example.com', '00000000-0000-0000-0000-000000000001', now());

-- Equipment
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment (id, branch_id, type_id, kind, number, created_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', (SELECT id FROM back_office.equipment_types WHERE legacy_kind = 'reformer'), 'reformer', 0, '00000000-0000-0000-0000-000000000001', now())$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment (id, branch_id, type_id, kind, number, created_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', (SELECT id FROM back_office.equipment_types WHERE legacy_kind = 'reformer'), 'reformer', 100, '00000000-0000-0000-0000-000000000001', now())$q$, '23514');
INSERT INTO back_office.equipment (id, branch_id, type_id, kind, number, created_by_account_id, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', (SELECT id FROM back_office.equipment_types WHERE legacy_kind = 'reformer'), 'reformer', 1, '00000000-0000-0000-0000-000000000001', now()),
 ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', (SELECT id FROM back_office.equipment_types WHERE legacy_kind = 'cadillac'), 'cadillac', 1, '00000000-0000-0000-0000-000000000001', now()),
 ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', (SELECT id FROM back_office.equipment_types WHERE legacy_kind = 'reformer'), 'reformer', 1, '00000000-0000-0000-0000-000000000001', now());
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment (id, branch_id, type_id, kind, number, created_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', (SELECT id FROM back_office.equipment_types WHERE legacy_kind = 'reformer'), 'reformer', 1, '00000000-0000-0000-0000-000000000001', now())$q$, '23505');
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment SET kind = 'mat' WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '55000');
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment SET number = 2 WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '55000');
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment SET branch_id = '00000000-0000-0000-0000-000000000002' WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '55000');
SELECT pg_temp.expect_failure($q$DELETE FROM back_office.equipment WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '55000');
UPDATE back_office.equipment SET archived_at = now() WHERE id = '00000000-0000-0000-0000-000000000003';
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment SET archived_at = NULL WHERE id = '00000000-0000-0000-0000-000000000003'$q$, '55000');
-- A retired number is free again.
INSERT INTO back_office.equipment (id, branch_id, type_id, kind, number, created_by_account_id, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', (SELECT id FROM back_office.equipment_types WHERE legacy_kind = 'reformer'), 'reformer', 1, '00000000-0000-0000-0000-000000000001', now());
SELECT pg_temp.expect_failure($q$DELETE FROM booking.branches WHERE id = '00000000-0000-0000-0000-000000000002'$q$, '23001');

-- Equipment Issues
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_issues (id, equipment_id, description, out_of_service, reported_by_account_id) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '   ', true, '00000000-0000-0000-0000-000000000001')$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_issues (id, equipment_id, description, out_of_service, reported_by_account_id) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', repeat('x', 501), true, '00000000-0000-0000-0000-000000000001')$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_issues (id, equipment_id, description, out_of_service, reported_by_account_id, resolved_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Resorte suelto', true, '00000000-0000-0000-0000-000000000001', now())$q$, '23514');
INSERT INTO back_office.equipment_issues (id, equipment_id, description, out_of_service, reported_by_account_id) VALUES
 ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Resorte suelto', true, '00000000-0000-0000-0000-000000000001');
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment_issues SET description = 'Otra cosa' WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '55000');
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment_issues SET out_of_service = false WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '55000');
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment_issues SET resolved_at = now() WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '23514');
SELECT pg_temp.expect_failure($q$DELETE FROM back_office.equipment_issues WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '55000');
UPDATE back_office.equipment_issues SET resolved_at = now(), resolved_by_account_id = '00000000-0000-0000-0000-000000000001' WHERE id = '00000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment_issues SET resolved_at = NULL, resolved_by_account_id = NULL WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '55000');
SELECT pg_temp.expect_failure($q$DELETE FROM back_office.equipment WHERE id = '00000000-0000-0000-0000-000000000002'$q$, '55000');

-- Equipment Types (FIX-067)
INSERT INTO back_office.equipment_types (id, name, tracking, created_by_account_id, updated_at) VALUES
 ('00000000-0000-0000-0000-0000000000a1', 'Balones', 'quantity', '00000000-0000-0000-0000-000000000001', now()),
 ('00000000-0000-0000-0000-0000000000a2', 'Silla Wunda', 'unit', '00000000-0000-0000-0000-000000000001', now()),
 ('00000000-0000-0000-0000-0000000000a3', 'Aros', 'quantity', '00000000-0000-0000-0000-000000000001', now());
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_types (id, name, tracking, updated_at) VALUES (gen_random_uuid(), 'balones', 'unit', now())$q$, '23505');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_types (id, name, tracking, updated_at) VALUES (gen_random_uuid(), ' Pelotas', 'unit', now())$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_types (id, name, tracking, updated_at) VALUES (gen_random_uuid(), repeat('x', 41), 'unit', now())$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_types (id, name, tracking, updated_at) VALUES (gen_random_uuid(), '', 'unit', now())$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_types (id, name, tracking, legacy_kind, updated_at) VALUES (gen_random_uuid(), 'Otro reformer', 'unit', 'reformer', now())$q$, '23505');
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment_types SET tracking = 'unit' WHERE id = '00000000-0000-0000-0000-0000000000a1'$q$, '55000');
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment_types SET legacy_kind = 'mat' WHERE id = '00000000-0000-0000-0000-0000000000a2'$q$, '55000');
SELECT pg_temp.expect_failure($q$DELETE FROM back_office.equipment_types WHERE id = '00000000-0000-0000-0000-0000000000a2'$q$, '55000');
UPDATE back_office.equipment_types SET name = 'Silla' WHERE id = '00000000-0000-0000-0000-0000000000a2';
UPDATE back_office.equipment_types SET archived_at = now() WHERE id = '00000000-0000-0000-0000-0000000000a3';
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment_types SET archived_at = NULL WHERE id = '00000000-0000-0000-0000-0000000000a3'$q$, '55000');
-- An archived type's name is free again.
INSERT INTO back_office.equipment_types (id, name, tracking, updated_at) VALUES
 ('00000000-0000-0000-0000-0000000000a4', 'aros', 'quantity', now());

-- Numbered units of a studio type
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment (id, branch_id, type_id, number, created_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 1, '00000000-0000-0000-0000-000000000001', now())$q$, '23514');
INSERT INTO back_office.equipment_types (id, name, tracking, updated_at, archived_at) VALUES
 ('00000000-0000-0000-0000-0000000000a5', 'Barril', 'unit', now(), now());
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment (id, branch_id, type_id, number, created_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a5', 1, '00000000-0000-0000-0000-000000000001', now())$q$, '55000');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment (id, branch_id, type_id, kind, number, created_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2', 'mat', 1, '00000000-0000-0000-0000-000000000001', now())$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment (id, branch_id, number, created_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 3, '00000000-0000-0000-0000-000000000001', now())$q$, '23502');
INSERT INTO back_office.equipment (id, branch_id, type_id, number, created_by_account_id, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2', 1, '00000000-0000-0000-0000-000000000001', now()),
 ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', (SELECT id FROM back_office.equipment_types WHERE legacy_kind = 'mat'), 1, '00000000-0000-0000-0000-000000000001', now());
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment (id, branch_id, type_id, number, created_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2', 1, '00000000-0000-0000-0000-000000000001', now())$q$, '23505');
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment SET type_id = '00000000-0000-0000-0000-0000000000a2' WHERE id = '00000000-0000-0000-0000-000000000002'$q$, '55000');

-- Equipment Stocks
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_stocks (id, branch_id, type_id, quantity, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2', 3, now())$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_stocks (id, branch_id, type_id, quantity, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', -1, now())$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_stocks (id, branch_id, type_id, quantity, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 10000, now())$q$, '23514');
INSERT INTO back_office.equipment_stocks (id, branch_id, type_id, quantity, updated_at) VALUES
 ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 12, now());
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_stocks (id, branch_id, type_id, quantity, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 3, now())$q$, '23505');
UPDATE back_office.equipment_stocks SET quantity = 11 WHERE id = '00000000-0000-0000-0000-0000000000b1';
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment_stocks SET branch_id = '00000000-0000-0000-0000-000000000002' WHERE id = '00000000-0000-0000-0000-0000000000b1'$q$, '55000');
SELECT pg_temp.expect_failure($q$DELETE FROM back_office.equipment_stocks WHERE id = '00000000-0000-0000-0000-0000000000b1'$q$, '55000');

-- Stock damage
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_issues (id, stock_id, description, out_of_service, reported_by_account_id) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-0000000000b1', 'Pinchado', false, '00000000-0000-0000-0000-000000000001')$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_issues (id, stock_id, quantity, description, out_of_service, reported_by_account_id) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-0000000000b1', 0, 'Pinchado', false, '00000000-0000-0000-0000-000000000001')$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_issues (id, stock_id, quantity, description, out_of_service, reported_by_account_id) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-0000000000b1', 1, 'Pinchado', true, '00000000-0000-0000-0000-000000000001')$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_issues (id, equipment_id, stock_id, quantity, description, out_of_service, reported_by_account_id) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 1, 'Pinchado', false, '00000000-0000-0000-0000-000000000001')$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_issues (id, description, out_of_service, reported_by_account_id) VALUES (gen_random_uuid(), 'Nada', false, '00000000-0000-0000-0000-000000000001')$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment_issues (id, equipment_id, quantity, description, out_of_service, reported_by_account_id) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 1, 'Resorte', false, '00000000-0000-0000-0000-000000000001')$q$, '23514');
INSERT INTO back_office.equipment_issues (id, stock_id, quantity, description, out_of_service, reported_by_account_id) VALUES
 ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 2, 'Pinchados', false, '00000000-0000-0000-0000-000000000001');
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment_issues SET written_off = true WHERE id = '00000000-0000-0000-0000-0000000000c1'$q$, '23514');
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment_issues SET quantity = 1 WHERE id = '00000000-0000-0000-0000-0000000000c1'$q$, '55000');
UPDATE back_office.equipment_issues SET resolved_at = now(), resolved_by_account_id = '00000000-0000-0000-0000-000000000001', written_off = true WHERE id = '00000000-0000-0000-0000-0000000000c1';
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment_issues SET written_off = false WHERE id = '00000000-0000-0000-0000-0000000000c1'$q$, '55000');
INSERT INTO back_office.equipment_issues (id, equipment_id, description, out_of_service, reported_by_account_id) VALUES
 ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000005', 'Pata floja', false, '00000000-0000-0000-0000-000000000001');
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment_issues SET resolved_at = now(), resolved_by_account_id = '00000000-0000-0000-0000-000000000001', written_off = true WHERE id = '00000000-0000-0000-0000-0000000000d1'$q$, '23514');
