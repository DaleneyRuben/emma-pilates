-- Personal data request (BE-007 G8). Read-only, one query per context.
-- Run: psql "$DATABASE_URL" -v email='person@example.com' -f docs/runbooks/personal-data-request.sql
-- See docs/runbooks/personal-data-requests.md. Password hashes, credential
-- digests, push tokens, and device digests are deliberately not selected.
SET default_transaction_read_only = on;

-- System Identity
SELECT a.id AS account_id, a.email, a.created_at, a.email_verified_at, a.activated_at,
       a.password_changed_at, a.disabled_at, a.deleted_at AS closed_at
FROM system.accounts a
WHERE a.email = :'email'
ORDER BY a.created_at;

SELECT s.surface, s.created_at, s.last_meaningful_activity_at, s.revoked_at, s.revocation_reason
FROM system.authentication_sessions s
JOIN system.accounts a ON a.id = s.account_id
WHERE a.email = :'email'
ORDER BY s.created_at;

SELECT d.platform, d.registered_at, d.last_seen_at, d.deactivated_at, d.deactivation_reason
FROM system.account_devices d
JOIN system.accounts a ON a.id = d.account_id
WHERE a.email = :'email'
ORDER BY d.registered_at;

SELECT n.category, n.type, n.title, n.message, n.created_at, n.read_at
FROM system.notifications n
JOIN system.accounts a ON a.id = n.account_id
WHERE a.email = :'email'
ORDER BY n.created_at;

SELECT r.action_code, r.outcome, r.actor_kind, r.actor_role, r.target_type, r.occurred_at, r.metadata
FROM system.audit_records r
JOIN system.accounts a ON a.id IN (r.actor_account_id, r.target_id)
WHERE a.email = :'email'
ORDER BY r.occurred_at;

-- Booking & Membership
SELECT c.id AS client_id, c.name, c.phone, c.referral_code, c.created_at, c.deleted_at AS closed_at
FROM booking.clients c
JOIN system.accounts a ON a.client_id = c.id
WHERE a.email = :'email';

SELECT s.plan_name_snapshot AS plan, s.original_class_allowance, s.remaining_class_allowance,
       s.starts_on, s.ends_on, s.state, s.activated_at, s.expired_at
FROM booking.subscriptions s
JOIN system.accounts a ON a.client_id = s.client_id
WHERE a.email = :'email'
ORDER BY s.starts_on;

SELECT p.plan_name_snapshot AS plan, p.method, p.state, p.plan_price_centavos,
       p.credit_applied_centavos, p.amount_due_centavos, p.submitted_at, p.decided_at, p.rejection_reason
FROM booking.payments p
JOIN system.accounts a ON a.client_id = p.client_id
WHERE a.email = :'email'
ORDER BY p.submitted_at;

SELECT ses.starts_at, b.state, b.created_at, b.cancelled_at, b.cancellation_cause, att.outcome AS attendance
FROM booking.bookings b
JOIN booking.sessions ses ON ses.id = b.session_id
JOIN system.accounts a ON a.client_id = b.client_id
LEFT JOIN booking.attendance_records att ON att.booking_id = b.id
WHERE a.email = :'email'
ORDER BY ses.starts_at;

SELECT ses.starts_at, w.joined_at, w.closed_at, w.closure_reason
FROM booking.waitlist_entries w
JOIN booking.sessions ses ON ses.id = w.session_id
JOIN system.accounts a ON a.client_id = w.client_id
WHERE a.email = :'email'
ORDER BY w.joined_at;

SELECT slot.starts_at, e.state, e.created_at, e.cancelled_at, e.cancellation_cause
FROM booking.evaluations e
JOIN booking.evaluation_slots slot ON slot.id = e.evaluation_slot_id
JOIN system.accounts a ON a.client_id = e.client_id
WHERE a.email = :'email'
ORDER BY slot.starts_at;

SELECT l.occurred_at, l.kind, l.amount_centavos
FROM booking.credit_ledger_entries l
JOIN system.accounts a ON a.client_id = l.client_id
WHERE a.email = :'email'
ORDER BY l.occurred_at, l.id;

SELECT r.state, r.created_at, r.awarded_at, r.award_centavos,
       CASE WHEN r.referrer_client_id = a.client_id THEN 'referrer' ELSE 'referred' END AS role
FROM booking.referrals r
JOIN system.accounts a ON a.client_id IN (r.referrer_client_id, r.referred_client_id)
WHERE a.email = :'email'
ORDER BY r.created_at;

-- Back Office (Staff Members only)
SELECT sp.paid_on, sp.amount_centavos, sp.created_at
FROM back_office.salary_payments sp
JOIN system.accounts a ON a.staff_member_id = sp.staff_member_id
WHERE a.email = :'email'
ORDER BY sp.paid_on;
