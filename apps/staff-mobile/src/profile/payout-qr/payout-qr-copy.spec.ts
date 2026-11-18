import { payoutQrBanner, payoutQrRowValue, payoutQrStateLine } from "./payout-qr-copy";

const valid = { standing: "valid", validUntil: "2026-12-15" } as const;
const expiring = { standing: "expiring", validUntil: "2026-12-05" } as const;
const expired = { standing: "expired", validUntil: "2026-12-15" } as const;

// FIX-072, follow-up 276: the words for a payout QR's standing in Perfil.
describe("payout QR copy", () => {
  it("says the standing at the end of the Perfil row", () => {
    expect(payoutQrRowValue(null)).toEqual({ text: "Sin subir", tone: "muted" });
    expect(payoutQrRowValue(valid)).toEqual({
      text: "Vale hasta 15/12",
      tone: "muted",
    });
    expect(payoutQrRowValue(expiring)).toEqual({
      text: "Vence el 5/12",
      tone: "warning",
    });
    expect(payoutQrRowValue(expired)).toEqual({
      text: "Vencido",
      tone: "error",
    });
  });

  it("says the standing under the QR", () => {
    expect(payoutQrStateLine(valid)).toBe("Vale hasta el 15/12/2026");
    expect(payoutQrStateLine(expiring)).toBe("Vence el 5/12 · sube uno nuevo");
    expect(payoutQrStateLine(expired)).toBe("Venció el 15/12 · sube uno nuevo");
  });

  it("warns above the QR only when it expires soon or has expired", () => {
    expect(payoutQrBanner(valid)).toBeNull();
    expect(payoutQrBanner(expiring)).toEqual({
      tone: "warning",
      text: "Tu QR vence el 5/12. Sube uno nuevo antes para que no se atrase tu pago.",
    });
    expect(payoutQrBanner(expired)).toEqual({
      tone: "error",
      text: "Tu QR venció el 15/12. Administración no puede usarlo para pagarte: sube uno nuevo.",
    });
  });
});
