export type GiftPayment = {
  method: 'transfer' | 'cash' | 'credit_only' | 'courtesy';
  hidden: boolean;
  priceCentavos: number;
};

export type GiftClassDecision = {
  classes: 1;
  reason: 'gift_new_client';
};

// A real Payment is one a Client paid for a Plan the catalog shows. Courtesy
// Access (method courtesy, Bs 0) and any hidden Plan — a tester grant, a
// store review, a guest pass — are never a first Plan, so they neither
// receive nor consume the gift.
const isRealPayment = (payment: GiftPayment): boolean =>
  payment.method !== 'courtesy' && !payment.hidden && payment.priceCentavos > 0;

// BKM-010 reads the Founder Membership here. Until that row exists, no Client
// is a founder; a caller that already knows the flag passes it through.
export const isFounder = (client: { founder: boolean }): boolean =>
  client.founder;

// BKM-008, decisions §5.2: +1 on the first real Payment of a Client's life,
// once, and never for a founder. `founder` is false until BKM-010 makes the
// Founder Membership real; the decision already honours it.
export const decideGiftClass = (input: {
  founder: boolean;
  earlierRealPayment: boolean;
  payment: GiftPayment;
}): GiftClassDecision | null => {
  if (input.founder || input.earlierRealPayment) return null;
  if (!isRealPayment(input.payment)) return null;
  return { classes: 1, reason: 'gift_new_client' };
};
