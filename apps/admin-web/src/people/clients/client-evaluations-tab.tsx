import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { StatusPill } from "../../components/ui/status-pill";
import { formatCivilMoment } from "../../lib/bolivia-time";
import { clientEvaluationsQueryOptions } from "./client-file-queries";
import { ClientFileItem, ClientFileSection } from "./client-file-list";

// P03 Evaluaciones: every Evaluation she booked, newest first, with no
// amount (ADR-0108 lets the Coordinator read them).
export function ClientEvaluationsTab({ clientId }: { clientId: string }) {
  const evaluations = useQuery(clientEvaluationsQueryOptions(clientId));
  // When the tab opened decides Próxima or Hecha.
  const [now] = useState(() => Date.now());
  return (
    <ClientFileSection
      title="Evaluaciones"
      query={evaluations}
      what="sus evaluaciones"
      loading="Cargando sus evaluaciones…"
      empty="Todavía no reservó ninguna evaluación."
    >
      {(page) =>
        page.items.map((evaluation) => (
          <ClientFileItem
            key={evaluation.evaluationId}
            title={
              evaluation.kind === "first" ? "Primera evaluación" : "Seguimiento"
            }
            detail={`${formatCivilMoment(evaluation.startsAt)} · ${evaluation.nutritionistName} · ${evaluation.branchName}`}
            aside={
              Date.parse(evaluation.startsAt) > now ? (
                <StatusPill tone="exito">Próxima</StatusPill>
              ) : (
                <StatusPill tone="neutral">Hecha</StatusPill>
              )
            }
          />
        ))
      }
    </ClientFileSection>
  );
}
