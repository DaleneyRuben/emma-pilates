-- W16 B/C (owner, 2026-11-19): «Motivo si rechazas (opcional)». The reason
-- an Administrator or Coordinator gives when refusing a Freeze, sent to the
-- Client with the refusal. Nullable, so earlier rows and apps keep working;
-- only a refused Freeze carries one, never blank.
ALTER TABLE "booking"."freezes" ADD COLUMN     "refusal_reason" TEXT;

ALTER TABLE "booking"."freezes" ADD CONSTRAINT "freezes_refusal_reason_check" CHECK (
  "refusal_reason" IS NULL
  OR ("state" = 'refused' AND char_length(btrim("refusal_reason")) BETWEEN 1 AND 300)
);
