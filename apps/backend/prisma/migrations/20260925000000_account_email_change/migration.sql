-- IDN-008: email change for active Accounts (proposal decisions E1-E14).

-- AlterEnum
ALTER TYPE "system"."AuthenticationTokenPurpose" ADD VALUE 'email_change';

-- CreateTable
CREATE TABLE "system"."account_email_changes" (
    "account_id" UUID NOT NULL,
    "new_email" TEXT NOT NULL,
    "authentication_token_id" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

CONSTRAINT "account_email_changes_pkey" PRIMARY KEY ("account_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_email_changes_authentication_token_id_key" ON "system"."account_email_changes"("authentication_token_id");

-- AddForeignKey
ALTER TABLE "system"."account_email_changes" ADD CONSTRAINT "account_email_changes_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "system"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."account_email_changes" ADD CONSTRAINT "account_email_changes_authentication_token_id_fkey" FOREIGN KEY ("authentication_token_id") REFERENCES "system"."authentication_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
