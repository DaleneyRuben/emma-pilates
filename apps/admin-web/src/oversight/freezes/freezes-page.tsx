import type { FreezeReviewDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { CatalogPage } from "../../catalog/catalog-page";
import { FilterChips } from "../../components/ui/filter-chips";
import { decidedFreezeColumns, pendingFreezeColumns } from "./freeze-columns";
import {
  decidedFreezesQueryOptions,
  requestedFreezesQueryOptions,
} from "./freeze-queries";
import { FreezeReviewPanel } from "./freeze-review-panel";

type FreezeView = "pending" | "decided";

// FIX-091 (W16 A): the two views as chips, the pending one with its count.
function ViewChips({
  view,
  pending,
  onChange,
}: {
  view: FreezeView;
  pending: number | undefined;
  onChange: (view: FreezeView) => void;
}) {
  return (
    <FilterChips<FreezeView>
      label="Congelamientos"
      value={view}
      options={[
        { value: "pending", label: "Por decidir", count: pending },
        { value: "decided", label: "Decididos" },
      ]}
      onChange={(next) => onChange(next ?? "pending")}
    />
  );
}

const listProps = {
  title: "Congelamientos",
  loadingMessage: "Cargando congelamientos…",
  what: "los congelamientos",
  search: { page: 1, pageSize: 40 },
  onPageChange: () => undefined,
};

function PendingFreezes({ filter }: { filter: ReactNode }) {
  const query = useQuery(requestedFreezesQueryOptions());
  return (
    <CatalogPage<FreezeReviewDto>
      {...listProps}
      subtitle="Solicitudes pendientes de una clienta."
      emptyMessage={
        <span className="text-texto">No hay solicitudes pendientes.</span>
      }
      filter={filter}
      query={query}
      columns={(open) => pendingFreezeColumns(open)}
      panelTitles={{
        create: "Congelamiento",
        edit: (freeze) => `${freeze.clientName} · congelamiento`,
      }}
      renderForm={(freeze, done) =>
        freeze === undefined ? null : (
          <FreezeReviewPanel freeze={freeze} onDone={done} />
        )
      }
      footer={
        query.data === undefined || query.data.totalItems === 0 ? null : (
          <p className="text-nota text-texto">
            Aprobar o rechazar se hace dentro de cada solicitud; rechazar pide
            confirmación.
          </p>
        )
      }
    />
  );
}

function DecidedFreezes({ filter }: { filter: ReactNode }) {
  const query = useQuery(decidedFreezesQueryOptions());
  return (
    <CatalogPage
      {...listProps}
      subtitle="Solicitudes aprobadas, rechazadas o retiradas."
      emptyMessage={
        <span className="text-texto">
          Todavía no hay congelamientos decididos.
        </span>
      }
      filter={filter}
      query={query}
      columns={decidedFreezeColumns}
    />
  );
}

// Findings 52/53: the pending requests show what approving does to the plan
// end; «Decididos» keeps the approved and refused ones as history. FIX-091
// (W16 A + B): each pending one is decided in its review panel.
export function FreezesPage() {
  const [view, setView] = useState<FreezeView>("pending");
  const pending = useQuery(requestedFreezesQueryOptions());
  const filter = (
    <ViewChips
      view={view}
      pending={pending.data?.totalItems}
      onChange={setView}
    />
  );

  return view === "pending" ? (
    <PendingFreezes filter={filter} />
  ) : (
    <DecidedFreezes filter={filter} />
  );
}
