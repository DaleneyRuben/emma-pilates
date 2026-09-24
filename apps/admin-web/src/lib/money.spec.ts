import {
  formatBolivianos,
  formatSignedBolivianos,
  parseBolivianos,
} from "./money";

describe("formatBolivianos", () => {
  it("prints integer centavos as Bs with dot thousands and comma decimals (ADR-0082)", () => {
    expect(formatBolivianos(105_000)).toBe("Bs 1.050,00");
    expect(formatBolivianos(56_000)).toBe("Bs 560,00");
    expect(formatBolivianos(960_000)).toBe("Bs 9.600,00");
    expect(formatBolivianos(15_050)).toBe("Bs 150,50");
    expect(formatBolivianos(5)).toBe("Bs 0,05");
  });
});

describe("formatSignedBolivianos", () => {
  it("puts a minus sign before Bs when a net figure is below zero", () => {
    expect(formatSignedBolivianos(-120_000)).toBe("−Bs 1.200,00");
    expect(formatSignedBolivianos(96_000)).toBe("Bs 960,00");
    expect(formatSignedBolivianos(0)).toBe("Bs 0,00");
  });
});

describe("parseBolivianos", () => {
  it("reads what an Administrator types into whole centavos", () => {
    expect(parseBolivianos("1050")).toBe(105_000);
    expect(parseBolivianos("1.050")).toBe(105_000);
    expect(parseBolivianos("1.050,00")).toBe(105_000);
    expect(parseBolivianos(" 150,5 ")).toBe(15_050);
    expect(parseBolivianos("Bs 9.600,00")).toBe(960_000);
    expect(parseBolivianos("1050.50")).toBe(105_050);
  });

  it("refuses anything that is not an exact amount of centavos", () => {
    expect(parseBolivianos("")).toBeNull();
    expect(parseBolivianos("abc")).toBeNull();
    expect(parseBolivianos("10,505")).toBeNull();
    expect(parseBolivianos("-5")).toBeNull();
    expect(parseBolivianos("1,2,3")).toBeNull();
  });
});
