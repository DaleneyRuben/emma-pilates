import { qrDate } from "./payout-qr-dates";

export type PayoutQrStanding = "valid" | "expiring" | "expired";
export type PayoutQrSummary = {
  standing: PayoutQrStanding;
  /** The QR's last valid day, `yyyy-mm-dd`. */
  validUntil: string;
};
export type PayoutQrTone = "muted" | "warning" | "error";

// FIX-072, follow-up 276: the value at the end of Perfil's «Mi QR de cobro».
export const payoutQrRowValue = (
  qr: PayoutQrSummary | null,
): { text: string; tone: PayoutQrTone } => {
  if (qr === null) return { text: "Sin subir", tone: "muted" };
  if (qr.standing === "expired") return { text: "Vencido", tone: "error" };
  if (qr.standing === "expiring")
    return { text: `Vence el ${qrDate(qr.validUntil)}`, tone: "warning" };
  return { text: `Vale hasta el ${qrDate(qr.validUntil)}`, tone: "muted" };
};

export const payoutQrStateLine = (qr: PayoutQrSummary): string => {
  if (qr.standing === "expired") return `Venció el ${qrDate(qr.validUntil)} · sube uno nuevo`;
  if (qr.standing === "expiring") return `Vence el ${qrDate(qr.validUntil)} · sube uno nuevo`;
  return `Vale hasta el ${qrDate(qr.validUntil)}`;
};

export const payoutQrBanner = (
  qr: PayoutQrSummary,
): { tone: "warning" | "error"; text: string } | null => {
  if (qr.standing === "expired")
    return {
      tone: "error",
      text: `Tu QR venció el ${qrDate(qr.validUntil)}. Administración no puede usarlo para pagarte: sube uno nuevo.`,
    };
  if (qr.standing === "expiring")
    return {
      tone: "warning",
      text: `Tu QR vence el ${qrDate(qr.validUntil)}. Sube uno nuevo antes para que no se atrase tu pago.`,
    };
  return null;
};
