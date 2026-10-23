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
import { equipmentName } from "./equipment-format";
import {
  branchIssuesQueryOptions,
  useEquipmentChange,
  type IssueStatus,
} from "./equipment-queries";

const issueName = (issue: EquipmentIssueDto) =>
  equipmentName(issue.equipmentKind, issue.equipmentNumber);

function IssueRow({
  issue,
  onResolve,
}: {
  issue: EquipmentIssueDto;
  onResolve?: (issue: EquipmentIssueDto) => void;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-t border-divisor px-4 py-3 first:border-t-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-cuerpo font-medium text-texto">{issueName(issue)}</p>
        <p className="text-cuerpo text-texto">{issue.description}</p>
        <p className="text-[12.5px] text-texto-tenue tabular">
          {`Reportó ${issue.reportedByName} · ${formatCivilMoment(issue.reportedAt)}`}
        </p>
        {issue.resolvedAt === null ? null : (
          <p className="text-[12.5px] text-texto-tenue tabular">
            {`Resuelta por ${issue.resolvedByName ?? ""} · ${formatCivilMoment(issue.resolvedAt)}`}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {issue.outOfService ? (
          <StatusPill tone="error">Fuera de servicio</StatusPill>
        ) : (
          <StatusPill tone="advertencia">Se puede usar</StatusPill>
        )}
        {onResolve === undefined ? null : (
          <Button variant="neutral" size="sm" onClick={() => onResolve(issue)}>
            Marcar resuelta
          </Button>
        )}
      </div>
    </li>
  );
}

// AW37's «Fallas» card: the open faults, newest first, or the resolved ones.
export function EquipmentIssuesCard({
  branchId,
  onNotice,
}: {
  branchId: string;
  onNotice: (notice: string) => void;
}) {
  const titleId = useId();
  const [status, setStatus] = useState<IssueStatus>("open");
  const [resolving, setResolving] = useState<EquipmentIssueDto | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const issues = useQuery(branchIssuesQueryOptions(branchId, status));
  const change = useEquipmentChange(branchId);

  const resolve = async () => {
    if (resolving === null) return;
    setFailure(null);
    try {
      await change.mutateAsync({ kind: "resolve", issueId: resolving.id });
      onNotice(`Marcamos resuelta la falla de ${issueName(resolving)}.`);
    } catch (error) {
      setFailure(backOfficeProblem(error).message);
    }
    setResolving(null);
  };

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col rounded-tarjeta border border-borde bg-blanco"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divisor px-4 py-3">
        <h2 id={titleId} className="font-serif text-[19px] text-texto">
          Fallas
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
              {...(status === "open" ? { onResolve: setResolving } : {})}
            />
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={resolving !== null}
        onOpenChange={(open) => {
          if (!open) setResolving(null);
        }}
        title={`¿Marcar resuelta la falla de ${resolving === null ? "" : issueName(resolving)}?`}
        confirmLabel="Marcar resuelta"
        tone="primary"
        busy={change.isPending}
        onConfirm={() => void resolve()}
      >
        <p>
          {`${resolving === null ? "" : issueName(resolving)} vuelve a contar como disponible si no tiene otra falla abierta que lo deje fuera de servicio.`}
        </p>
      </ConfirmDialog>
    </section>
  );
}
