export type EmailSuppressionInput = {
  email: string;
  reason: 'HARD_BOUNCE' | 'COMPLAINT';
  providerEventId: string;
  providerOccurredAt: Date;
};

// Red checkpoint stub: the parsing is implemented in the next commit.
export const suppressionsFromResendEvent = (
  eventId: string,
  event: unknown,
): EmailSuppressionInput[] => (eventId && event ? [] : []);
