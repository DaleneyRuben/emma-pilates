import { formatBolivianos } from "./bolivianos";

describe("formatBolivianos", () => {
  it("formats centavos as whole Bolivianos with es-BO grouping", () => {
    expect(formatBolivianos(56_000)).toBe("Bs 560");
    expect(formatBolivianos(105_000)).toBe("Bs 1.050");
    expect(formatBolivianos(0)).toBe("Bs 0");
  });

  it("rounds leftover centavos half up to whole bolivianos", () => {
    expect(formatBolivianos(210_050)).toBe("Bs 2.101");
    expect(formatBolivianos(210_049)).toBe("Bs 2.100");
    expect(formatBolivianos(50)).toBe("Bs 1");
    expect(formatBolivianos(49)).toBe("Bs 0");
  });
});
