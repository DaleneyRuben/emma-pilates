import { describeAllowance, firstName, formatCivilDate } from "./home-format";

describe("Home formatting", () => {
  it("greets by first name only", () => {
    expect(firstName("Lucía Fernández")).toBe("Lucía");
    expect(firstName("  Ana ")).toBe("Ana");
  });

  it("formats Bolivia civil dates in Spanish", () => {
    expect(formatCivilDate("2026-10-11")).toBe("dom 11 oct");
    expect(formatCivilDate("2026-08-30")).toBe("dom 30 ago");
  });

  it("describes the remaining allowance out of the Plan total", () => {
    expect(describeAllowance(5, 8)).toBe("5 de 8 clases");
    expect(describeAllowance(0, 16)).toBe("0 de 16 clases");
  });
});
