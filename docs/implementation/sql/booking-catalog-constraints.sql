-- Proposed PostgreSQL protections not expressible in the Prisma fragment.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE booking.plans
  ADD CONSTRAINT plans_values_check CHECK (
    length(btrim(name)) > 0 AND duration_months IN (1, 3, 6, 12)
    AND class_allowance > 0 AND price_centavos >= 0 AND display_order >= 0
  );
CREATE UNIQUE INDEX plans_visible_normalized_name_key
  ON booking.plans (lower(btrim(name))) WHERE hidden_at IS NULL;

ALTER TABLE booking.class_types
  ADD CONSTRAINT class_types_values_check CHECK (
    length(btrim(name)) > 0 AND length(btrim(description)) > 0
    AND duration_minutes > 0 AND default_capacity > 0
  );
CREATE UNIQUE INDEX class_types_active_normalized_name_key
  ON booking.class_types (lower(btrim(name))) WHERE archived_at IS NULL;

ALTER TABLE booking.session_schedules
  ADD CONSTRAINT session_schedules_values_check CHECK (
    weekday BETWEEN 1 AND 7 AND capacity > 0
    AND (effective_until IS NULL OR effective_until > effective_from)
  );

ALTER TABLE booking.sessions
  ADD CONSTRAINT sessions_values_check CHECK (ends_at > starts_at AND capacity > 0),
  -- Explicit IS NOT NULL is necessary: PostgreSQL CHECK accepts unknown/null.
  ADD CONSTRAINT sessions_cancellation_check CHECK (
    (state = 'scheduled' AND cancellation_cause IS NULL
      AND cancelled_at IS NULL AND cancelled_by_account_id IS NULL)
    OR (state = 'cancelled' AND cancelled_at IS NOT NULL
      AND cancellation_cause IS NOT NULL AND (
        (cancellation_cause = 'zero_bookings' AND cancelled_by_account_id IS NULL)
        OR (cancellation_cause = 'no_substitute_trainer' AND cancelled_by_account_id IS NOT NULL)
      ))
  ),
  ADD CONSTRAINT sessions_branch_no_overlap EXCLUDE USING gist (
    branch_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (state = 'scheduled'),
  ADD CONSTRAINT sessions_trainer_no_overlap EXCLUDE USING gist (
    trainer_staff_member_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (state = 'scheduled');

ALTER TABLE booking.subscriptions
  ADD CONSTRAINT subscriptions_values_check CHECK (
    length(btrim(plan_name_snapshot)) > 0
    AND duration_months_snapshot IN (1, 3, 6, 12)
    AND original_class_allowance > 0
    AND remaining_class_allowance BETWEEN 0 AND original_class_allowance
    AND ends_on >= starts_on
  ),
  ADD CONSTRAINT subscriptions_state_check CHECK (
    (state = 'active' AND expired_at IS NULL)
    OR (state = 'expired' AND expired_at IS NOT NULL)
  );
-- BKM-006 replaced this index: a Client may hold the current active
-- Subscription and one future active Subscription. now() is not immutable, so
-- the pair is a pair of BEFORE INSERT triggers (subscriptions_one_current,
-- subscriptions_one_future) rather than partial unique indexes.

ALTER TABLE booking.promotions
  ADD CONSTRAINT promotions_values_check CHECK (
    length(btrim(headline)) > 0 AND length(btrim(description)) > 0
    AND display_ends_on >= display_starts_on AND display_order >= 0
  ),
  ADD CONSTRAINT promotions_publication_check CHECK (
    published_at IS NULL OR (image_asset_id IS NOT NULL AND archived_at IS NULL)
  );
