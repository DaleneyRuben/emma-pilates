/**
 * The whole-percent discount a founder price carries off the list price, or
 * null without a list price (C09's «Desglose», S12's since walkthrough n.º 73).
 */
export function discountPercent(prices: {
  listPriceCentavos?: number;
  priceCentavos: number;
}): number | null {
  if (prices.listPriceCentavos === undefined || prices.listPriceCentavos === 0) return null;
  return Math.round((1 - prices.priceCentavos / prices.listPriceCentavos) * 100);
}
