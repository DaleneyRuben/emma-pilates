-- BE-012 S10: an email request event is keyed by its source, never by a
-- recipient or a Login lane. Its own migration: the enum value it names
-- cannot be used in the transaction that adds it.
ALTER TABLE "system"."authentication_throttle_events"
    DROP CONSTRAINT "authentication_throttle_events_kind_purpose_check",
    ADD CONSTRAINT "authentication_throttle_events_kind_purpose_check"
    CHECK (
        ("event_kind" = 'failed_credential_check' AND "purpose" = 'login' AND "login_lane_digest" IS NOT NULL)
        OR
        ("event_kind" = 'message_issued' AND "purpose" <> 'login' AND "recipient_digest" IS NOT NULL)
        OR
        ("event_kind" = 'email_requested' AND "purpose" IN ('verification', 'password_recovery')
            AND "network_digest" IS NOT NULL AND "recipient_digest" IS NULL AND "login_lane_digest" IS NULL)
    );
