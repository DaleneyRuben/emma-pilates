import { boliviaMonth } from '../../time/bolivia-time';

export type GuestPassBookingDecision = {
  code: 'guest_pass_already_used' | 'guest_pass_last_place';
  detail: string;
};

// BKM-014, decisions §5.3. A Guest Pass spends a courtesy class that is not
// a first Plan. The last place stays for a paying Client.
export const decideGuestPassBooking = (input: {
  placesLeft: number;
  guestPassesAlreadyUsed: number;
}): GuestPassBookingDecision | null => {
  if (input.guestPassesAlreadyUsed > 0) {
    return {
      code: 'guest_pass_already_used',
      detail: 'A Guest Pass is once in a lifetime',
    };
  }
  if (input.placesLeft <= 1) {
    return {
      code: 'guest_pass_last_place',
      detail: 'A Guest Pass cannot take the last place',
    };
  }
  return null;
};

export type InvitationDecision = {
  code: 'guest_pass_monthly_limit';
  detail: string;
};

export const decideInvitation = (input: {
  now: Date;
  earlierInvitations: readonly Date[];
  invitesPerMonth: number;
}): InvitationDecision | null => {
  const month = boliviaMonth(input.now).toISOString();
  const invitationsThisMonth = input.earlierInvitations.filter(
    (invitedAt) => boliviaMonth(invitedAt).toISOString() === month,
  ).length;
  if (invitationsThisMonth >= input.invitesPerMonth) {
    return {
      code: 'guest_pass_monthly_limit',
      detail: 'A host invites one friend a month',
    };
  }
  return null;
};

export type InviteRewardDecision = {
  subscriptionId: string | null;
  owed: boolean;
};

export const decideInviteReward = (input: {
  alreadyRewarded: boolean;
  currentSubscriptionId: string | null;
  // The host's own Guest Pass is never a real Subscription. The +1 waits
  // for her current real Plan, or her next one (FIX-005).
  currentSubscriptionIsGuestPass?: boolean;
}): InviteRewardDecision | null => {
  if (input.alreadyRewarded) return null;
  return {
    subscriptionId: input.currentSubscriptionId,
    owed: input.currentSubscriptionId === null,
  };
};
