import { useMutation, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { CatalogPage } from "../catalog/catalog-page";
import type { SearchChange } from "../catalog/catalog-search";
import { ClientPhoto } from "../components/client-photo";
import { countFormat } from "../components/table/pagination";
import { Button } from "../components/ui/button";
import { InlineError } from "../components/ui/inline-error";
import { FilterChips } from "../components/ui/filter-chips";
import { saveFile } from "../lib/save-file";
import { feedbackColumns } from "./feedback-columns";
import { FeedbackCounters } from "./feedback-counters";
import {
  appLabels,
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

// FIX-091 (W3 B): the two filters as chips; «all» is the catch-all chip.
const statusOptions = [
  { value: undefined, label: "Todos" },
  { value: "new", label: "Nuevo" },
  { value: "reviewed", label: "Revisado" },
  { value: "resolved", label: "Resuelto" },
] as const;

const appOptions = [
  { value: undefined, label: "Las dos" },
  { value: "client", label: appLabels.client },
  { value: "staff", label: appLabels.staff },
] as const;

const chosen = <Value extends string>(value: Value) =>
  value === "all" ? undefined : (value as Exclude<Value, "all">);

const comentarios = (count: number) =>
  `${countFormat.format(count)} ${count === 1 ? "comentario" : "comentarios"}`;

function EmptyFeedback({ filtered }: { filtered: boolean }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto">
        {filtered
          ? "Ningún comentario con estos filtros."
          : "Todavía no hay comentarios."}
      </span>
      <span>
        Llegan desde «Enviar comentarios», en el Perfil de las dos apps.
      </span>
    </span>
  );
}

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
      subtitle="Desde las dos apps"
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
          {query.data === undefined ? null : (
            <FeedbackCounters page={query.data} />
          )}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <FilterChips<Exclude<FeedbackStatusFilter, "all">>
              label="Estado"
              value={chosen(search.status)}
              options={statusOptions}
              onChange={(status) =>
                onSearchChange({ status: status ?? "all", page: 1 })
              }
            />
            <FilterChips<Exclude<FeedbackAppFilter, "all">>
              label="App"
              value={chosen(search.app)}
              options={appOptions}
              onChange={(app) => onSearchChange({ app: app ?? "all", page: 1 })}
            />
          </div>
          {exportFeedback.isError ? (
            <InlineError>
              No pudimos exportar los comentarios. Inténtalo de nuevo.
            </InlineError>
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
      avatar={(feedback) => (
        <ClientPhoto name={feedback.senderName} photo={null} size={40} />
      )}
      renderForm={(feedback, done) =>
        feedback === undefined ? null : (
          <FeedbackPanel feedback={feedback} onDone={done} />
        )
      }
    />
  );
}
