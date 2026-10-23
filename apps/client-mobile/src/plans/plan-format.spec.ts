import { formatBolivianos } from "./plan-format";

describe("Plan formatting", () => {
  it("formats centavos as Bolivianos with es-BO grouping", () => {
    expect(formatBolivianos(56_000)).toBe("Bs 560");
    expect(formatBolivianos(105_000)).toBe("Bs 1.050");
    expect(formatBolivianos(210_050)).toBe("Bs 2.100,50");
  });
});
