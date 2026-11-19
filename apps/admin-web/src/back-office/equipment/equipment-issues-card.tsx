import type { EquipmentIssueDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { ChoiceChips } from "../../components/form/choice-chips";
import {
  LoadingNotice,
  QueryFailure,
} from "../../components/page/query-failure";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { StatusPill } from "../../components/ui/status-pill";
import { formatCivilMoment } from "../../lib/bolivia-time";
import { backOfficeProblem } from "../back-office-problems";
import { damagedLabel, issueSubject, issueTitle } from "./equipment-format";
import {
  branchIssuesQueryOptions,
  useEquipmentChange,
  type IssueStatus,
} from "./equipment-queries";

type Asking = { kind: "resolve" | "write-off"; issue: EquipmentIssueDto };

function IssueRow({
  issue,
  onAsk,
}: {
  issue: EquipmentIssueDto;
  onAsk?: (asking: Asking) => void;
}) {
  return (
    <li className="flex flex-col gap-3 border-t border-divisor px-4 py-3 first:border-t-0 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-cuerpo font-medium text-texto">
          {issueTitle(issue)}
        </p>
        <p className="text-cuerpo text-texto">{issue.description}</p>
        <p className="text-nota text-texto-tenue tabular">
          {`Reportó ${issue.reportedByName} · ${formatCivilMoment(issue.reportedAt)}`}
        </p>
        {issue.resolvedAt === null ? null : (
          <p className="text-nota text-texto-tenue tabular">
            {`${issue.writtenOff ? "Dada de baja" : "Resuelta"} por ${issue.resolvedByName ?? ""} · ${formatCivilMoment(issue.resolvedAt)}`}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {issue.outOfService ? (
          <StatusPill tone="error">Fuera de servicio</StatusPill>
        ) : null}
        {onAsk !== undefined && issue.quantity !== null ? (
          <Button
            variant="link"
            className="text-error hover:text-error-texto"
            onClick={() => onAsk({ kind: "write-off", issue })}
          >
            Dar de baja
          </Button>
        ) : null}
        {onAsk === undefined ? null : (
          <Button
            variant="neutral"
            size="sm"
            onClick={() => onAsk({ kind: "resolve", issue })}
          >
            Marcar resuelta
          </Button>
        )}
      </div>
    </li>
  );
}

const confirmCopy = ({ kind, issue }: Asking) => {
  const subject = issueSubject(issue);
  if (kind === "write-off") {
    const damaged = damagedLabel(issue.quantity ?? 0);
    return {
      title: `¿Dar de baja ${damaged} de ${subject}?`,
      body: `Salen del total de ${subject} en esta sucursal. La falla queda en el historial.`,
      label: "Dar de baja",
      notice: `Dimos de baja ${damaged} de ${subject}.`,
    };
  }
  return {
    title: `¿Marcar resuelta la falla de ${subject}?`,
    body:
      issue.quantity === null
        ? `${subject} vuelve a contar como disponible si no tiene otra falla abierta que lo deje fuera de servicio.`
        : "Vuelven a contar como que se pueden usar.",
    label: "Marcar resuelta",
    notice: `Marcamos resuelta la falla de ${subject}.`,
  };
};

// AW37's «Fallas abiertas» (FIX-067): a unit's faults and a stock's damage,
// newest first, or the resolved ones.
export function EquipmentIssuesCard({
  branchId,
  onNotice,
}: {
  branchId: string;
  onNotice: (notice: string) => void;
}) {
  const titleId = useId();
  const [status, setStatus] = useState<IssueStatus>("open");
  const [asking, setAsking] = useState<Asking | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const issues = useQuery(branchIssuesQueryOptions(branchId, status));
  const change = useEquipmentChange(branchId);
  const copy = asking === null ? null : confirmCopy(asking);

  const confirm = async () => {
    if (asking === null || copy === null) return;
    setFailure(null);
    try {
      await change.mutateAsync({ kind: asking.kind, issueId: asking.issue.id });
      onNotice(copy.notice);
    } catch (error) {
      setFailure(backOfficeProblem(error).message);
    }
    setAsking(null);
  };

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col rounded-marco border border-borde bg-lino"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divisor px-4 py-3">
        <h2 id={titleId} className="font-serif text-[19px] text-texto">
          {status === "open"
            ? `Fallas abiertas · ${issues.data?.length ?? 0}`
            : "Fallas resueltas"}
        </h2>
        <ChoiceChips
          legend="Qué fallas mostrar"
          name="issue-status"
          value={status}
          options={[
            ["open", "Abiertas"],
            ["resolved", "Resueltas"],
          ]}
          onChange={setStatus}
          className="w-[220px]"
        />
      </div>
      {failure === null ? null : (
        <p role="alert" className="px-4 pt-3 text-nota text-error-texto">
          {failure}
        </p>
      )}
      {issues.isPending ? (
        <div className="px-4 py-3">
          <LoadingNotice>Cargando fallas…</LoadingNotice>
        </div>
      ) : issues.isError ? (
        <div className="px-4 py-3">
          <QueryFailure
            error={issues.error}
            what="las fallas"
            onRetry={() => void issues.refetch()}
          />
        </div>
      ) : issues.data.length === 0 ? (
        <p className="px-4 py-4 text-nota text-texto-tenue">
          {status === "open"
            ? "No hay fallas abiertas."
            : "Todavía no hay fallas resueltas."}
        </p>
      ) : (
        <ul>
          {issues.data.map((issue) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              {...(status === "open" ? { onAsk: setAsking } : {})}
            />
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={asking !== null}
        onOpenChange={(open) => {
          if (!open) setAsking(null);
        }}
        title={copy?.title ?? ""}
        confirmLabel={copy?.label ?? ""}
        tone={asking?.kind === "write-off" ? "destructive" : "primary"}
        busy={change.isPending}
        onConfirm={() => void confirm()}
      >
        <p>{copy?.body ?? ""}</p>
      </ConfirmDialog>
    </section>
  );
}
