import { describePlanTerms, describeValidity, formatBolivianos } from "./plan-format";

describe("Plan formatting", () => {
  it("formats centavos as Bolivianos with es-BO grouping", () => {
    expect(formatBolivianos(56_000)).toBe("Bs 560");
    expect(formatBolivianos(105_000)).toBe("Bs 1.050");
    expect(formatBolivianos(210_050)).toBe("Bs 2.100,50");
  });

  it("describes validity by month count", () => {
    expect(describeValidity(1)).toBe("Válido por 1 mes");
    expect(describeValidity(3)).toBe("Válido por 3 meses");
  });

  it("summarizes classes and validity for a Plan card", () => {
    expect(describePlanTerms(8, 1)).toBe("8 clases · válido por 1 mes");
    expect(describePlanTerms(36, 3)).toBe("36 clases · válidas por 3 meses");
  });
});
