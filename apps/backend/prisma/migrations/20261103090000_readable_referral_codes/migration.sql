-- BKM-017 (owner 2026-11-02): readable Referral Codes for every Client and
-- Trainer, built from the name (Lucía Fernández → LUCIA, then FERNANDEZ, then
-- LUCIA2, LUCIA3…), editable by their holder once every 30 days.
--
-- booking.referral_codes is the registry of every code ever held, by a Client
-- or by a Staff Member. A code is unique across both kinds and stays reserved
-- after it is retired, so a code a Client stopped using never sends a new
-- friend to someone else; its old holder may take it back. Attribution comes
-- from the live row's holder, never from the text of the code (the REF-
-- prefix no longer separates the two kinds). The clients and staff_members
-- columns keep the current code; triggers keep the registry in step with
-- them, whatever writes them.

-- AlterTable
ALTER TABLE "booking"."clients" ADD COLUMN     "referral_code_changed_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "booking"."staff_members" ADD COLUMN     "referral_code_changed_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "booking"."referral_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "client_id" UUID,
    "staff_member_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMPTZ(3),

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "referral_codes_one_holder_check" CHECK (num_nonnulls("client_id", "staff_member_id") = 1)
);

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "booking"."referral_codes"("code");

-- One live code per holder.
CREATE UNIQUE INDEX "referral_codes_live_client_key" ON "booking"."referral_codes"("client_id") WHERE "retired_at" IS NULL AND "client_id" IS NOT NULL;
CREATE UNIQUE INDEX "referral_codes_live_staff_member_key" ON "booking"."referral_codes"("staff_member_id") WHERE "retired_at" IS NULL AND "staff_member_id" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "booking"."referral_codes" ADD CONSTRAINT "referral_codes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking"."referral_codes" ADD CONSTRAINT "referral_codes_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "booking"."staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Every code held today, as it is.
INSERT INTO "booking"."referral_codes" ("code", "client_id", "created_at")
SELECT "referral_code", "id", "created_at" FROM "booking"."clients";
INSERT INTO "booking"."referral_codes" ("code", "staff_member_id", "created_at")
SELECT "referral_code", "id", "created_at" FROM "booking"."staff_members"
WHERE "referral_code" IS NOT NULL;

-- A code's holder changes the column; the registry follows: the previous code
-- is retired and the new one registered (or taken back by its old holder). A
-- code someone else holds or held fails referral_codes_code_key.
CREATE FUNCTION "booking"."sync_referral_code"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  client_holder UUID := CASE WHEN TG_TABLE_NAME = 'clients' THEN NEW."id" END;
  staff_holder UUID := CASE WHEN TG_TABLE_NAME = 'staff_members' THEN NEW."id" END;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."referral_code" IS NOT DISTINCT FROM OLD."referral_code" THEN
    RETURN NEW;
  END IF;
  UPDATE "booking"."referral_codes"
  SET "retired_at" = CURRENT_TIMESTAMP, "updated_at" = CURRENT_TIMESTAMP
  WHERE "retired_at" IS NULL
    AND "client_id" IS NOT DISTINCT FROM client_holder
    AND "staff_member_id" IS NOT DISTINCT FROM staff_holder;
  IF NEW."referral_code" IS NULL THEN
    RETURN NEW;
  END IF;
  UPDATE "booking"."referral_codes"
  SET "retired_at" = NULL, "updated_at" = CURRENT_TIMESTAMP
  WHERE "code" = NEW."referral_code"
    AND "client_id" IS NOT DISTINCT FROM client_holder
    AND "staff_member_id" IS NOT DISTINCT FROM staff_holder;
  IF NOT FOUND THEN
    INSERT INTO "booking"."referral_codes" ("code", "client_id", "staff_member_id")
    VALUES (NEW."referral_code", client_holder, staff_holder);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "clients_sync_referral_code"
AFTER INSERT OR UPDATE OF "referral_code" ON "booking"."clients"
FOR EACH ROW EXECUTE FUNCTION "booking"."sync_referral_code"();

CREATE TRIGGER "staff_members_sync_referral_code"
AFTER INSERT OR UPDATE OF "referral_code" ON "booking"."staff_members"
FOR EACH ROW EXECUTE FUNCTION "booking"."sync_referral_code"();

-- The owner's basic blocklist: reserved words a code may not start with
-- (EMMA, ADMIN…), and common Spanish insults and swear words a code may not
-- contain. Digits and hyphens are ignored, so PUTA-1 is PUTA. A change to the
-- list is a new migration that replaces this function.
CREATE FUNCTION "booking"."referral_code_blocked"(code TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  WITH letters AS (SELECT regexp_replace(upper(code), '[^A-Z]', '', 'g') AS value)
  SELECT EXISTS (
    SELECT 1 FROM letters, unnest(ARRAY[
      'EMMA', 'ADMIN', 'ADMINISTRA', 'SOPORTE', 'SUPPORT', 'OFICIAL', 'STAFF',
      'ESTUDIO', 'STUDIO', 'PILATES', 'RECEPCION', 'GERENCIA', 'DUENA'
    ]) AS reserved(word)
    WHERE letters.value LIKE reserved.word || '%'
  ) OR EXISTS (
    SELECT 1 FROM letters, unnest(ARRAY[
      'PUTA', 'PUTO', 'MIERDA', 'CARAJO', 'CABRON', 'PENDEJ', 'MARICON',
      'VERGA', 'CULO', 'JODER', 'JODID', 'CHINGA', 'PELOTUD', 'BOLUDO',
      'COJUDO', 'HUEVON', 'HUEVADA', 'IDIOTA', 'ESTUPID', 'IMBECIL', 'GILIPOLL',
      'ZORRA', 'PERRA', 'MALPARID', 'HIJODEPUTA', 'CONCHATUMADRE', 'PORNO',
      'SEXO', 'NAZI', 'MARICA', 'CAGAR', 'CACA', 'TETAS', 'PICHULA'
    ]) AS insult(word)
    WHERE position(insult.word IN letters.value) > 0
  );
$$;

-- A readable code from a name: the first name, then the surname, then the
-- first name with 2, 3…; upper case, without accents, spaces or symbols, at
-- most 20 characters, never blocked and never held by anyone, live or
-- retired. The advisory lock makes two registrations with the same name wait
-- for each other instead of failing on the unique index; it is held until the
-- transaction that writes the code commits.
CREATE FUNCTION "booking"."claim_readable_referral_code"(holder_name TEXT) RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  words TEXT[];
  first_word TEXT;
  surname TEXT;
  candidate TEXT;
  attempt INTEGER := 2;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('booking.referral_codes'));
  SELECT array_agg(word ORDER BY position) INTO words
  FROM unnest(regexp_split_to_array(
    regexp_replace(
      translate(upper(coalesce(holder_name, '')),
        'ÁÀÂÄÃÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇ', 'AAAAAEEEEIIIIOOOOOUUUUNC'),
      '[^A-Z0-9 ]', '', 'g'),
    '\s+')) WITH ORDINALITY AS split(word, position)
  WHERE word <> '' AND word NOT IN ('DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y');
  first_word := left(coalesce(words[1], ''), 20);
  surname := left(coalesce(words[2], ''), 20);
  IF length(first_word) < 3 THEN
    first_word := left(first_word || surname, 20);
    surname := '';
  END IF;
  IF length(first_word) < 3 THEN
    first_word := 'AMIGA';
  END IF;

  FOREACH candidate IN ARRAY ARRAY[first_word, surname] LOOP
    IF length(candidate) >= 3
      AND NOT "booking"."referral_code_blocked"(candidate)
      AND NOT EXISTS (SELECT 1 FROM "booking"."referral_codes" WHERE "code" = candidate) THEN
      RETURN candidate;
    END IF;
  END LOOP;
  IF "booking"."referral_code_blocked"(first_word) THEN
    first_word := CASE
      WHEN length(surname) >= 3 AND NOT "booking"."referral_code_blocked"(surname) THEN surname
      ELSE 'AMIGA'
    END;
  END IF;
  LOOP
    candidate := left(first_word, 20 - length(attempt::TEXT)) || attempt::TEXT;
    IF NOT EXISTS (SELECT 1 FROM "booking"."referral_codes" WHERE "code" = candidate) THEN
      RETURN candidate;
    END IF;
    attempt := attempt + 1;
  END LOOP;
END;
$$;

-- Backfill: every REF- code (REF-<uuid> in production, REF-<name> in the
-- development fixtures) becomes readable, oldest Client first, and
-- every live Trainer without a code gets one. A Client registered with an old
-- code keeps her attribution: client_acquisitions and referrals point at the
-- holder, not at the code.
DO $$
DECLARE
  row RECORD;
BEGIN
  FOR row IN
    SELECT "id", "name" FROM "booking"."clients"
    WHERE "referral_code" LIKE 'REF-%'
    ORDER BY "created_at", "id"
  LOOP
    UPDATE "booking"."clients"
    SET "referral_code" = "booking"."claim_readable_referral_code"(row."name")
    WHERE "id" = row."id";
  END LOOP;
  FOR row IN
    SELECT "id", "name" FROM "booking"."staff_members"
    WHERE "role" = 'trainer' AND "referral_code" IS NULL AND "deleted_at" IS NULL
    ORDER BY "created_at", "id"
  LOOP
    UPDATE "booking"."staff_members"
    SET "referral_code" = "booking"."claim_readable_referral_code"(row."name")
    WHERE "id" = row."id";
  END LOOP;
END;
$$;
