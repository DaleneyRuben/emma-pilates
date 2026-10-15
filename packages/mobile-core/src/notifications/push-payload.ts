import { z } from "zod";

// ADR-0036: a push carries a notification type and record identifiers only.
// Anything else, including a URL, is ignored, and a malformed value rejects
// the whole payload, so a tap can never steer the app somewhere unvetted.
const identifier = z.uuid();
const code = z
  .string()
  .max(64)
  .regex(/^[a-z][a-z_]*$/);

const pushPayloadSchema = z.object({
  notificationId: identifier,
  type: code,
  destinationType: code.nullable(),
  destinationId: identifier.nullable(),
});

export type PushPayload = z.infer<typeof pushPayloadSchema>;

export function parsePushPayload(value: unknown): PushPayload | null {
  const parsed = pushPayloadSchema.safeParse(value);

  return parsed.success ? parsed.data : null;
}
