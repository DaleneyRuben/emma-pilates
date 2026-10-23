export type GiftPayment = {
  method: 'transfer' | 'cash' | 'credit_only' | 'courtesy';
  hidden: boolean;
  priceCentavos: number;
};

export type GiftClassDecision = {
  classes: 1;
  reason: 'gift_new_client';
};

// Placeholder so the failing tests type-check. The rule is not implemented.
export const decideGiftClass = (input: {
  founder: boolean;
  earlierRealPayment: boolean;
  payment: GiftPayment;
}): GiftClassDecision | null => {
  void input;
  return null;
};
