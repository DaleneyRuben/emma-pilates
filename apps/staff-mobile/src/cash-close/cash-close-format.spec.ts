import { differenceValue, formatSignedBolivianos } from "./cash-close-format";

describe("cash-close money with centavos", () => {
  it("keeps the sign and the centavos on a difference", () => {
    expect(formatSignedBolivianos(550)).toBe("+Bs 5,50");
    expect(formatSignedBolivianos(-1_000)).toBe("−Bs 10");
    expect(formatSignedBolivianos(0)).toBe("Bs 0");
  });
});

describe("differenceValue", () => {
  it("reads «Cuadra» or what is missing or over", () => {
    expect(differenceValue(0)).toBe("Cuadra");
    expect(differenceValue(-1_000)).toBe("Falta Bs 10");
    expect(differenceValue(550)).toBe("Sobra Bs 5,50");
  });
});
