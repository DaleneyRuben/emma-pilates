import { formatBolivianos } from "./bolivianos";

// FIX-090: one money format on every surface, the shared formatMoney.
describe("formatBolivianos", () => {
  it("leaves the decimals out when they are ,00", () => {
    expect(formatBolivianos(56_000)).toBe("Bs 560");
    expect(formatBolivianos(105_000)).toBe("Bs 1.050");
    expect(formatBolivianos(0)).toBe("Bs 0");
  });

  it("shows the centavos when there are any", () => {
    expect(formatBolivianos(153_490)).toBe("Bs 1.534,90");
    expect(formatBolivianos(210_049)).toBe("Bs 2.100,49");
    expect(formatBolivianos(50)).toBe("Bs 0,50");
  });
});
