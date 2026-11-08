import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { CatalogPage } from "../../catalog/catalog-page";
import { ListFilter } from "../../components/table/list-filter";
import { decidedFreezeColumns, pendingFreezeColumns } from "./freeze-columns";
import {
  decidedFreezesQueryOptions,
  requestedFreezesQueryOptions,
} from "./freeze-queries";

type FreezeView = "pending" | "decided";

const viewOptions: readonly { value: FreezeView; label: string }[] = [
  { value: "pending", label: "Por revisar" },
  { value: "decided", label: "Decididas" },
];

function ViewFilter({
  view,
  onChange,
}: {
  view: FreezeView;
  onChange: (view: FreezeView) => void;
}) {
  return (
    <ListFilter
      label="Vista"
      value={view}
      options={viewOptions}
      onChange={onChange}
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

function PendingFreezes({
  filter,
  notice,
  onNotice,
}: {
  filter: ReactNode;
  notice: string | null;
  onNotice: (message: string) => void;
}) {
  const query = useQuery(requestedFreezesQueryOptions());
  return (
    <CatalogPage
      {...listProps}
      subtitle={notice ?? "Solicitudes pendientes de una clienta."}
      emptyMessage={
        <span className="text-texto-secundario">
          No hay solicitudes pendientes.
        </span>
      }
      filter={filter}
      query={query}
      columns={() => pendingFreezeColumns(onNotice)}
    />
  );
}

function DecidedFreezes({
  filter,
  notice,
}: {
  filter: ReactNode;
  notice: string | null;
}) {
  const query = useQuery(decidedFreezesQueryOptions());
  return (
    <CatalogPage
      {...listProps}
      subtitle={notice ?? "Solicitudes aprobadas o rechazadas."}
      emptyMessage={
        <span className="text-texto-secundario">
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
// end; «Decididas» keeps the approved and refused ones as history.
export function FreezesPage() {
  const [view, setView] = useState<FreezeView>("pending");
  const [notice, setNotice] = useState<string | null>(null);
  const filter = <ViewFilter view={view} onChange={setView} />;

  return view === "pending" ? (
    <PendingFreezes filter={filter} notice={notice} onNotice={setNotice} />
  ) : (
    <DecidedFreezes filter={filter} notice={notice} />
  );
}
