// FIX-042 (DES-009, decisiones §20.24): why a cancelled Session the Horario
// and the Trainer's agenda still show was cancelled.
export const sessionCancellationCauses = [
  'minimum_not_met',
  'studio',
  'schedule_paused',
] as const;

export type SessionCancellation = {
  cause: (typeof sessionCancellationCauses)[number];
  cancelledAt: Date;
  bookedCount: number;
};
