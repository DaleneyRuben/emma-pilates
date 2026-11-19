import type { AdminPaymentDtoState } from "@pilates/api-contracts";
import { StatusPill } from "../components/ui/status-pill";

// Por revisar/Confirmado/Rechazado, never the glossary's avoided
// "pendiente/completado" pair (booking/CONTEXT.md, Payment). FIX-091 (W4 B):
// a transfer waiting reads «Por revisar», like Pagos' chip.
const pills = {
  pending: { tone: "advertencia", label: "Por revisar" },
  confirmed: { tone: "exito", label: "Confirmado" },
  rejected: { tone: "error", label: "Rechazado" },
  voided: { tone: "neutral", label: "Anulado" },
} as const;

export function PaymentStatePill({ state }: { state: AdminPaymentDtoState }) {
  const pill = pills[state];
  return <StatusPill tone={pill.tone}>{pill.label}</StatusPill>;
}
