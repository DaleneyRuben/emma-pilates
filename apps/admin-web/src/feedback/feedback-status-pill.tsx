import type { AdminFeedbackDtoStatus } from "@pilates/api-contracts";
import { StatusPill } from "../components/ui/status-pill";
import { statusLabels } from "./feedback-format";

// AW38: the status as a plain word; FIX-091 (W3 B) took the pill off «Nuevo»,
// the counters on top already say how many wait.
export function FeedbackStatusPill({
  status,
}: {
  status: AdminFeedbackDtoStatus;
}) {
  return <StatusPill tone="neutral">{statusLabels[status]}</StatusPill>;
}
