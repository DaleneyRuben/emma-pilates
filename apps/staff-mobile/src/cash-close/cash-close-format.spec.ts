import { formatCashCloseBolivianos, formatSignedBolivianos } from "./cash-close-format";

describe("cash-close money with centavos", () => {
  it("prints two decimals in es-BO for the drawer amounts", () => {
    expect(formatCashCloseBolivianos(52_000)).toBe("Bs 520,00");
    expect(formatCashCloseBolivianos(52_550)).toBe("Bs 525,50");
    expect(formatCashCloseBolivianos(0)).toBe("Bs 0,00");
  });

  it("keeps the sign and the centavos on a difference", () => {
    expect(formatSignedBolivianos(550)).toBe("+Bs 5,50");
    expect(formatSignedBolivianos(-1_000)).toBe("−Bs 10,00");
    expect(formatSignedBolivianos(0)).toBe("Bs 0,00");
  });
});
