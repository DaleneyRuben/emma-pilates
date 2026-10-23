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
  void input;
  return null;
};
