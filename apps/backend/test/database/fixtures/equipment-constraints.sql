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
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment (id, branch_id, kind, number, created_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'reformer', 0, '00000000-0000-0000-0000-000000000001', now())$q$, '23514');
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment (id, branch_id, kind, number, created_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'reformer', 100, '00000000-0000-0000-0000-000000000001', now())$q$, '23514');
INSERT INTO back_office.equipment (id, branch_id, kind, number, created_by_account_id, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'reformer', 1, '00000000-0000-0000-0000-000000000001', now()),
 ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'cadillac', 1, '00000000-0000-0000-0000-000000000001', now()),
 ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'reformer', 1, '00000000-0000-0000-0000-000000000001', now());
SELECT pg_temp.expect_failure($q$INSERT INTO back_office.equipment (id, branch_id, kind, number, created_by_account_id, updated_at) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'reformer', 1, '00000000-0000-0000-0000-000000000001', now())$q$, '23505');
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment SET kind = 'mat' WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '55000');
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment SET number = 2 WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '55000');
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment SET branch_id = '00000000-0000-0000-0000-000000000002' WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '55000');
SELECT pg_temp.expect_failure($q$DELETE FROM back_office.equipment WHERE id = '00000000-0000-0000-0000-000000000001'$q$, '55000');
UPDATE back_office.equipment SET archived_at = now() WHERE id = '00000000-0000-0000-0000-000000000003';
SELECT pg_temp.expect_failure($q$UPDATE back_office.equipment SET archived_at = NULL WHERE id = '00000000-0000-0000-0000-000000000003'$q$, '55000');
-- A retired number is free again.
INSERT INTO back_office.equipment (id, branch_id, kind, number, created_by_account_id, updated_at) VALUES
 ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'reformer', 1, '00000000-0000-0000-0000-000000000001', now());
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
