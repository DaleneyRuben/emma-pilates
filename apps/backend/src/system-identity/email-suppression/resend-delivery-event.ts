import { z } from 'zod';

export type EmailSuppressionInput = {
  email: string;
  reason: 'HARD_BOUNCE' | 'COMPLAINT';
  providerEventId: string;
  providerOccurredAt: Date;
};

const eventSchema = z.object({
  type: z.string(),
  created_at: z.iso.datetime({ offset: true }),
  data: z.object({
    to: z.array(z.string()),
    bounce: z.object({ type: z.string() }).optional(),
  }),
});

const reasonFor = (
  event: z.infer<typeof eventSchema>,
): EmailSuppressionInput['reason'] | null => {
  if (event.type === 'email.complained') return 'COMPLAINT';
  // ADR-0031: only a permanent bounce suppresses; a soft one never does.
  if (event.type === 'email.bounced' && event.data.bounce?.type === 'Permanent')
    return 'HARD_BOUNCE';
  return null;
};

// The Svix message id is stable across redeliveries, so it keys idempotency.
export const suppressionsFromResendEvent = (
  eventId: string,
  event: unknown,
): EmailSuppressionInput[] => {
  const parsed = eventSchema.safeParse(event);
  if (!parsed.success) return [];
  const reason = reasonFor(parsed.data);
  if (reason === null) return [];

  return parsed.data.data.to.map((email, index) => ({
    email: email.trim().toLowerCase(),
    reason,
    providerEventId: index === 0 ? eventId : `${eventId}:${index}`,
    providerOccurredAt: new Date(parsed.data.created_at),
  }));
};
