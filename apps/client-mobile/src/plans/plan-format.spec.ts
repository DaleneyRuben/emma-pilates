import { formatBolivianos } from "./plan-format";

describe("Plan formatting", () => {
  it("leaves the decimals out when they are ,00", () => {
    expect(formatBolivianos(56_000)).toBe("Bs 560");
    expect(formatBolivianos(105_000)).toBe("Bs 1.050");
    expect(formatBolivianos(0)).toBe("Bs 0");
  });

  // FIX-090: the shared money format shows the centavos when there are any.
  it("shows the centavos when there are any", () => {
    expect(formatBolivianos(210_050)).toBe("Bs 2.100,50");
    expect(formatBolivianos(49)).toBe("Bs 0,49");
  });
});
