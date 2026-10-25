import type { AdminFeedbackDtoStatus } from "@pilates/api-contracts";
import { StatusPill } from "../components/ui/status-pill";
import { statusLabels } from "./feedback-format";

// AW38: «Nuevo» waits for someone (Advertencia), «Revisado» is read
// (neutral), «Resuelto» changed something (Éxito).
const tones = {
  new: "advertencia",
  reviewed: "neutral",
  resolved: "exito",
} as const;

export function FeedbackStatusPill({
  status,
}: {
  status: AdminFeedbackDtoStatus;
}) {
  return <StatusPill tone={tones[status]}>{statusLabels[status]}</StatusPill>;
}
