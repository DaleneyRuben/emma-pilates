import type { AdminFeedbackDto } from "@pilates/api-contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { CatalogPage, RowOpener } from "../catalog/catalog-page";
import type { SearchChange } from "../catalog/catalog-search";
import { ListFilter } from "../components/table/list-filter";
import { countFormat } from "../components/table/pagination";
import { Button } from "../components/ui/button";
import { formatCivilMoment } from "../lib/bolivia-time";
import { saveFile } from "../lib/save-file";
import {
  appLabels,
  deviceLabel,
  feedbackCsv,
  feedbackCsvName,
  typeLabels,
} from "./feedback-format";
import { FeedbackPanel } from "./feedback-panel";
import {
  feedbackTableQueryOptions,
  fetchAllFeedback,
} from "./feedback-queries";
import type {
  FeedbackAppFilter,
  FeedbackSearch,
  FeedbackStatusFilter,
} from "./feedback-search";
import { FeedbackStatusPill } from "./feedback-status-pill";

const statusOptions: { value: FeedbackStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "new", label: "Nuevo" },
  { value: "reviewed", label: "Revisado" },
  { value: "resolved", label: "Resuelto" },
];

const appOptions: { value: FeedbackAppFilter; label: string }[] = [
  { value: "all", label: "Las dos" },
  { value: "client", label: appLabels.client },
  { value: "staff", label: appLabels.staff },
];

const comentarios = (count: number) =>
  `${countFormat.format(count)} ${count === 1 ? "comentario" : "comentarios"}`;

const subtitle = (newCount: number) =>
  newCount === 0
    ? "Desde las dos apps · ninguno nuevo"
    : `Desde las dos apps · ${countFormat.format(newCount)} ${newCount === 1 ? "comentario nuevo" : "comentarios nuevos"}`;

function EmptyFeedback({ filtered }: { filtered: boolean }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto-secundario">
        {filtered
          ? "Ningún comentario con estos filtros."
          : "Todavía no hay comentarios."}
      </span>
      <span className="text-nota text-texto-tenue">
        Llegan desde «Enviar comentarios», en el Perfil de las dos apps.
      </span>
    </span>
  );
}

const columns = createColumnHelper<AdminFeedbackDto>();

const feedbackColumns = (open: (row: AdminFeedbackDto) => void) => [
  columns.accessor("createdAt", {
    header: "Fecha",
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-texto-secundario tabular">
        {formatCivilMoment(getValue())}
      </span>
    ),
  }),
  columns.accessor("type", {
    header: "Tipo",
    cell: ({ getValue }) => (
      <span className="text-texto-secundario">{typeLabels[getValue()]}</span>
    ),
  }),
  columns.accessor("text", {
    header: "Comentario",
    cell: ({ row }) => (
      <span className="line-clamp-2 max-w-[420px]">
        <RowOpener
          label={row.original.text}
          onOpen={() => open(row.original)}
        />
      </span>
    ),
  }),
  columns.accessor("app", {
    header: "App",
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-texto-secundario">
        {appLabels[getValue()]}
      </span>
    ),
  }),
  columns.display({
    id: "version",
    header: "Versión",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-texto-secundario tabular">
        {deviceLabel(row.original)}
      </span>
    ),
  }),
  columns.accessor("status", {
    header: "Estado",
    cell: ({ getValue }) => <FeedbackStatusPill status={getValue()} />,
  }),
];

// AW38 (REL-012): what Clients and Staff send from «Enviar comentarios»,
// triaged here and exported for Google's production questionnaire.
export function FeedbackPage({
  search,
  onSearchChange,
}: {
  search: FeedbackSearch;
  onSearchChange: SearchChange<FeedbackSearch>;
}) {
  const query = useQuery(feedbackTableQueryOptions(search));
  const exportFeedback = useMutation({
    mutationFn: fetchAllFeedback,
    onSuccess: (items) =>
      saveFile(
        feedbackCsvName(new Date()),
        feedbackCsv(items),
        "text/csv;charset=utf-8",
      ),
  });
  const filtered = search.status !== "all" || search.app !== "all";
  const none = !filtered && query.data?.totalItems === 0;

  return (
    <CatalogPage
      title="Comentarios"
      subtitle={
        query.data === undefined ? undefined : subtitle(query.data.newCount)
      }
      loadingMessage="Cargando comentarios…"
      what="los comentarios"
      emptyMessage={<EmptyFeedback filtered={filtered} />}
      panelTitles={{ create: "Comentario", edit: "Comentario" }}
      panelDescription={(row) =>
        `${typeLabels[row.type]} · ${appLabels[row.app]}`
      }
      links={
        <Button
          variant="neutral"
          busy={exportFeedback.isPending}
          disabled={query.data === undefined || none}
          onClick={() => exportFeedback.mutate()}
        >
          <Download size={16} strokeWidth={1.8} aria-hidden="true" />
          Exportar CSV
        </Button>
      }
      filter={
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <ListFilter
              label="Estado"
              value={search.status}
              options={statusOptions}
              onChange={(status) => onSearchChange({ status, page: 1 })}
            />
            <ListFilter
              label="App"
              value={search.app}
              options={appOptions}
              onChange={(app) => onSearchChange({ app, page: 1 })}
            />
          </div>
          {exportFeedback.isError ? (
            <p
              role="alert"
              className="rounded-control bg-error/10 px-3 py-2 text-nota text-error-texto"
            >
              No pudimos exportar los comentarios. Inténtalo de nuevo.
            </p>
          ) : null}
        </div>
      }
      search={search}
      onPageChange={(page) => onSearchChange({ page })}
      rangeLabel={({ shown, totalItems }) =>
        `Mostrando ${countFormat.format(shown)} de ${comentarios(totalItems)}`
      }
      query={query}
      columns={feedbackColumns}
      renderForm={(feedback, done) =>
        feedback === undefined ? null : (
          <FeedbackPanel feedback={feedback} onDone={done} />
        )
      }
    />
  );
}
