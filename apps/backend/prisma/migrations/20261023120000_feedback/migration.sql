-- REL-012: «Enviar comentarios» from either app, with the app version, build,
-- platform, OS version, and Role attached, triaged on the admin web.

-- CreateEnum
CREATE TYPE "system"."FeedbackType" AS ENUM ('problem', 'suggestion', 'other');

-- CreateEnum
CREATE TYPE "system"."FeedbackStatus" AS ENUM ('new', 'reviewed', 'resolved');

-- CreateEnum
CREATE TYPE "system"."FeedbackApp" AS ENUM ('client', 'staff');

-- CreateEnum
CREATE TYPE "system"."FeedbackPlatform" AS ENUM ('android', 'ios');

-- CreateTable
CREATE TABLE "system"."feedback" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "app" "system"."FeedbackApp" NOT NULL,
    "sender_role" TEXT NOT NULL,
    "type" "system"."FeedbackType" NOT NULL,
    "text" TEXT NOT NULL,
    "app_version" TEXT NOT NULL,
    "app_build" TEXT NOT NULL,
    "platform" "system"."FeedbackPlatform" NOT NULL,
    "os_version" TEXT NOT NULL,
    "status" "system"."FeedbackStatus" NOT NULL DEFAULT 'new',
    "change_note" TEXT,
    "triaged_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_account_id_created_at_idx" ON "system"."feedback"("account_id", "created_at");

-- CreateIndex
CREATE INDEX "feedback_created_at_idx" ON "system"."feedback"("created_at");

-- AddForeignKey
ALTER TABLE "system"."feedback" ADD CONSTRAINT "feedback_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "system"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The text is 10 to 2,000 characters and the note 1 to 2,000.
ALTER TABLE "system"."feedback" ADD CONSTRAINT "feedback_text_length" CHECK (char_length("text") BETWEEN 10 AND 2000);
ALTER TABLE "system"."feedback" ADD CONSTRAINT "feedback_change_note_length" CHECK ("change_note" IS NULL OR char_length("change_note") BETWEEN 1 AND 2000);

-- The metadata the app attaches stays short.
ALTER TABLE "system"."feedback" ADD CONSTRAINT "feedback_metadata_length" CHECK (char_length("app_version") BETWEEN 1 AND 40 AND char_length("app_build") BETWEEN 1 AND 40 AND char_length("os_version") BETWEEN 1 AND 40);

-- The Role matches the app it came from.
ALTER TABLE "system"."feedback" ADD CONSTRAINT "feedback_sender_role_matches_app" CHECK (("app" = 'client') = ("sender_role" = 'client'));

-- A Feedback leaves «Nuevo» only through triage, which stamps the time.
ALTER TABLE "system"."feedback" ADD CONSTRAINT "feedback_triaged_when_not_new" CHECK ("status" = 'new' OR "triaged_at" IS NOT NULL);
