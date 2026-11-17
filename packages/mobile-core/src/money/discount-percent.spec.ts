import { discountPercent } from "./discount-percent";

describe("discountPercent", () => {
  it("rounds the discount off the list price to a whole percent", () => {
    expect(discountPercent({ listPriceCentavos: 82_000, priceCentavos: 69_700 })).toBe(15);
  });

  it("is null without a list price", () => {
    expect(discountPercent({ priceCentavos: 69_700 })).toBeNull();
    expect(discountPercent({ listPriceCentavos: 0, priceCentavos: 0 })).toBeNull();
  });
});
