-- FIX-036 (owner 2026-11-04, decision §19.20): a Bolivian mobile is 8 digits
-- starting with 6 or 7, and the +591 is implicit. From now on the backend,
-- the apps and the admin web store it as «+591 XXXXXXXX». This brings the
-- phones saved before the rule (Daniela's «70000002», a «+59171234567») to
-- the same shape once. A phone that is not a Bolivian mobile stays as typed.
-- Data only: no column, constraint or index changes.

UPDATE "booking"."clients"
SET "phone" = '+591 ' || right(regexp_replace("phone", '[^0-9]', '', 'g'), 8),
    "updated_at" = CURRENT_TIMESTAMP
WHERE "phone" ~ '^[[:space:]]*(\+?591[[:space:]-]*)?[67]([[:space:]-]?[0-9]){7}[[:space:]]*$'
  AND "phone" <> '+591 ' || right(regexp_replace("phone", '[^0-9]', '', 'g'), 8);

UPDATE "booking"."staff_members"
SET "phone" = '+591 ' || right(regexp_replace("phone", '[^0-9]', '', 'g'), 8),
    "updated_at" = CURRENT_TIMESTAMP
WHERE "phone" ~ '^[[:space:]]*(\+?591[[:space:]-]*)?[67]([[:space:]-]?[0-9]){7}[[:space:]]*$'
  AND "phone" <> '+591 ' || right(regexp_replace("phone", '[^0-9]', '', 'g'), 8);
