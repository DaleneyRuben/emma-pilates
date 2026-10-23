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
  invitationsThisMonth: number;
  invitesPerMonth: number;
}): InvitationDecision | null => {
  void input;
  return null;
};

export type InviteRewardDecision = {
  subscriptionId: string | null;
  owed: boolean;
};

export const decideInviteReward = (input: {
  alreadyRewarded: boolean;
  currentSubscriptionId: string | null;
}): InviteRewardDecision | null => {
  void input;
  return null;
};
