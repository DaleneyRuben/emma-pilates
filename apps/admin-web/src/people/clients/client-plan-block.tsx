import {
  type AdminClientDetailDto,
  formatListDate,
} from "@pilates/api-contracts";
import { SummaryBlock, SummaryRow } from "../../components/panel/summary-rows";
import { StatusPill } from "../../components/ui/status-pill";
import { formatDayRange } from "../../lib/day-range";
import { classesLeft } from "./client-columns";

// AW22's Plan block. FIX-091 (W7 B): the Plan's own actions moved to the
// file's «Acciones» at the end, and an approved Freeze names its days.
export function ClientPlanBlock({
  view,
}: {
  view: AdminClientDetailDto["subscription"];
}) {
  const current = view.subscription;
  if (current === null || current === undefined || view.status === "none") {
    return (
      <SummaryBlock title="Plan">
        <SummaryRow label="Plan">
          <span className="text-texto">Sin plan activo</span>
        </SummaryRow>
      </SummaryBlock>
    );
  }
  if (view.status === "expired") {
    return (
      <SummaryBlock title="Plan">
        <SummaryRow label="Plan">
          <span className="flex items-center justify-end gap-2">
            <span className="tipo-compacto text-texto">Sin plan activo</span>
            <StatusPill tone="error">Plan vencido</StatusPill>
          </span>
        </SummaryRow>
        <p className="px-3 py-2 tipo-secundario text-texto">
          Último plan vencido el {formatListDate(current.endsOn)}.
        </p>
      </SummaryBlock>
    );
  }
  const freeze = view.freeze;
  return (
    <SummaryBlock title="Plan">
      <SummaryRow label="Plan">
        <span className="flex items-center justify-end gap-2">
          {current.planName}
          <StatusPill tone="exito">Activa</StatusPill>
        </span>
      </SummaryRow>
      <SummaryRow label="Vigencia">
        <span className="tabular">
          {formatListDate(current.startsOn)} – {formatListDate(current.endsOn)}
        </span>
      </SummaryRow>
      {/* Every Plan grants a fixed number of classes (follow-up 11). */}
      <SummaryRow label="Clases disponibles" figure>
        {classesLeft(
          current.remainingClassAllowance,
          current.originalClassAllowance,
          current.extraClasses,
        )}
      </SummaryRow>
      {freeze?.state === "approved" ? (
        <SummaryRow label="Congelado">
          <span className="tabular">
            {formatDayRange(freeze.startsOn, freeze.endsOn)}
          </span>
        </SummaryRow>
      ) : null}
      {/* Walkthrough n.º 60: the Plan she already bought. */}
      {view.nextSubscription == null ? null : (
        <SummaryRow label="Plan siguiente">
          {`${view.nextSubscription.planName} · empieza el ${formatListDate(view.nextSubscription.startsOn)}`}
        </SummaryRow>
      )}
      {current.extraClassesLine ? (
        <p className="px-3 py-2 tipo-secundario text-texto">
          {current.extraClassesLine}
        </p>
      ) : null}
    </SummaryBlock>
  );
}
