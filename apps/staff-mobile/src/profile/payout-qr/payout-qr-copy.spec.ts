import { payoutQrBanner, payoutQrRowValue, payoutQrStateLine } from "./payout-qr-copy";

const valid = { standing: "valid", validUntil: "2026-12-15" } as const;
const expiring = { standing: "expiring", validUntil: "2026-12-05" } as const;
const expired = { standing: "expired", validUntil: "2026-12-15" } as const;

// FIX-072, follow-up 276: the words for a payout QR's standing in Perfil.
describe("payout QR copy", () => {
  it("says the standing at the end of the Perfil row", () => {
    expect(payoutQrRowValue(null)).toEqual({ text: "Sin subir", tone: "muted" });
    expect(payoutQrRowValue(valid)).toEqual({
      text: "Vale hasta el mar 15 dic",
      tone: "muted",
    });
    expect(payoutQrRowValue(expiring)).toEqual({
      text: "Vence el sáb 5 dic",
      tone: "warning",
    });
    expect(payoutQrRowValue(expired)).toEqual({
      text: "Vencido",
      tone: "error",
    });
  });

  it("says the standing under the QR", () => {
    expect(payoutQrStateLine(valid)).toBe("Vale hasta el mar 15 dic");
    expect(payoutQrStateLine(expiring)).toBe("Vence el sáb 5 dic · sube uno nuevo");
    expect(payoutQrStateLine(expired)).toBe("Venció el mar 15 dic · sube uno nuevo");
  });

  it("warns above the QR only when it expires soon or has expired", () => {
    expect(payoutQrBanner(valid)).toBeNull();
    expect(payoutQrBanner(expiring)).toEqual({
      tone: "warning",
      text: "Tu QR vence el sáb 5 dic. Sube uno nuevo antes para que no se atrase tu pago.",
    });
    expect(payoutQrBanner(expired)).toEqual({
      tone: "error",
      text: "Tu QR venció el mar 15 dic. Administración no puede usarlo para pagarte: sube uno nuevo.",
    });
  });
});
