import type { AdminPaymentDtoState } from "@pilates/api-contracts";
import { StatusPill } from "../components/ui/status-pill";

// Pendiente/Confirmado/Rechazado, never the glossary's avoided
// "pendiente/completado" pair (booking/CONTEXT.md, Payment).
const pills = {
  pending: { tone: "advertencia", label: "Pendiente" },
  confirmed: { tone: "exito", label: "Confirmado" },
  rejected: { tone: "error", label: "Rechazado" },
  voided: { tone: "neutral", label: "Anulado" },
} as const;

export function PaymentStatePill({ state }: { state: AdminPaymentDtoState }) {
  const pill = pills[state];
  return <StatusPill tone={pill.tone}>{pill.label}</StatusPill>;
}
