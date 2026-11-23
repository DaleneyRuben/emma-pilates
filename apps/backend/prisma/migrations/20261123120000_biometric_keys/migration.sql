-- MOB-006 / ADR-0112: a biometric key lets one app installation sign an
-- Account in with the fingerprint or Face ID. Only digests are stored; each
-- use revokes the row («rotated») and adds its successor. New table only:
-- nothing existing changes, and nothing is ever deleted (ADR-0086).

-- CreateEnum
CREATE TYPE "system"."BiometricKeyRevocationReason" AS ENUM ('rotated', 'replaced', 'turned_off', 'reuse_detected', 'password_changed', 'password_recovered', 'account_disabled', 'account_closed');

-- CreateTable
CREATE TABLE "system"."biometric_keys" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "installation_id_digest" BYTEA NOT NULL,
    "key_digest" BYTEA NOT NULL,
    "unlock_secret_digest" BYTEA NOT NULL,
    "issued_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "revocation_reason" "system"."BiometricKeyRevocationReason",
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "biometric_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "biometric_keys_key_digest_key" ON "system"."biometric_keys"("key_digest");

CREATE INDEX "biometric_keys_account_id_revoked_at_idx" ON "system"."biometric_keys"("account_id", "revoked_at");

CREATE INDEX "biometric_keys_installation_id_digest_revoked_at_idx" ON "system"."biometric_keys"("installation_id_digest", "revoked_at");

-- AddForeignKey
ALTER TABLE "system"."biometric_keys" ADD CONSTRAINT "biometric_keys_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One live key per installation: issuing a new one revokes the previous first.
CREATE UNIQUE INDEX "biometric_keys_live_installation_key" ON "system"."biometric_keys"("installation_id_digest") WHERE "revoked_at" IS NULL AND "deleted_at" IS NULL;

-- A revoked key always says why.
ALTER TABLE "system"."biometric_keys" ADD CONSTRAINT "biometric_keys_revocation_check" CHECK (("revoked_at" IS NULL) = ("revocation_reason" IS NULL));
