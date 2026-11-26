import type { InvitationStatus } from './payment-views';

export const invitationOf = (
  _pass: unknown,
): {
  invitationStatus: InvitationStatus;
  freeClass: boolean;
} => {
  throw new Error('not implemented');
};
