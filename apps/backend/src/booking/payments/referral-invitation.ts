import type { InvitationStatus } from './payment-views';

type ReceivedGuestPass = {
  bookingId: string | null;
  rewardedAt: Date | null;
  rewardOwed: boolean;
};

/**
 * BKM-014: a friend's invitation as «Tus invitadas» shows it, read from the
 * Guest Pass she received. With none, the host's code was not active when
 * she registered (walkthrough n.º 22), so she has no free class to book.
 */
export const invitationOf = (
  pass: ReceivedGuestPass | null,
): { invitationStatus: InvitationStatus; freeClass: boolean } => {
  if (pass === null)
    return { invitationStatus: 'registered', freeClass: false };
  const invitationStatus: InvitationStatus =
    pass.rewardedAt !== null || pass.rewardOwed
      ? 'bought'
      : pass.bookingId !== null
        ? 'class_booked'
        : 'registered';
  return { invitationStatus, freeClass: true };
};
