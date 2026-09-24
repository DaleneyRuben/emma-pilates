import type { UseQueryResult } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { isForbidden } from "../components/page/is-forbidden";
import { PageHeader } from "../components/page/page-header";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { SidePanel } from "../components/panel/side-panel";
import { DataTable } from "../components/table/data-table";
import type { ListSearch } from "../components/table/pagination";
import { Button } from "../components/ui/button";

type CatalogPageProps<Row extends { id: string }> = {
  title: string;
  subtitle: string;
  createLabel: string;
  loadingMessage: string;
  /** Completes "No pudimos cargar …". */
  what: string;
  emptyMessage: string;
  panelTitles: { create: string; edit: string };
  filter: ReactNode;
  search: ListSearch;
  onPageChange: (page: number) => void;
  query: UseQueryResult<{ items: Row[]; totalItems: number }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each accessor column carries its own value type.
  columns: (open: (row: Row) => void) => ColumnDef<Row, any>[];
  renderForm: (row: Row | undefined, done: () => void) => ReactNode;
};

type PanelState<Row> = { open: false } | { open: true; row?: Row };

/**
 * The catalog list convention (design system → List pages): title and a
 * "+ Nuevo …" primary action, one allowlisted filter, a dense page-and-offset
 * table whose rows open the record in the side panel.
 */
export function CatalogPage<Row extends { id: string }>({
  title,
  subtitle,
  createLabel,
  loadingMessage,
  what,
  emptyMessage,
  panelTitles,
  filter,
  search,
  onPageChange,
  query,
  columns,
  renderForm,
}: CatalogPageProps<Row>) {
  const [panel, setPanel] = useState<PanelState<Row>>({ open: false });
  const open = (row: Row) => setPanel({ open: true, row });
  const close = () => setPanel({ open: false });

  return (
    <article className="flex flex-col gap-5">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          isForbidden(query.error) ? undefined : (
            <Button onClick={() => setPanel({ open: true })}>
              <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
              {createLabel}
            </Button>
          )
        }
      />
      {filter}
      {query.isPending ? (
        <LoadingNotice>{loadingMessage}</LoadingNotice>
      ) : query.isError ? (
        <QueryFailure
          error={query.error}
          what={what}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <DataTable
          columns={columns(open)}
          rows={query.data.items}
          rowId={(row) => row.id}
          emptyMessage={emptyMessage}
          onRowClick={open}
          pagination={{
            page: search.page,
            pageSize: search.pageSize,
            totalItems: query.data.totalItems,
            onPageChange,
          }}
        />
      )}
      <SidePanel
        open={panel.open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title={
          panel.open && panel.row !== undefined
            ? panelTitles.edit
            : panelTitles.create
        }
      >
        {panel.open ? (
          <div key={panel.row?.id ?? "new"} className="flex flex-1 flex-col">
            {renderForm(panel.row, close)}
          </div>
        ) : null}
      </SidePanel>
    </article>
  );
}

/** The row's name as the keyboard way into its panel. */
export function RowOpener({
  label,
  onOpen,
}: {
  label: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      className="rounded-control text-left font-medium text-texto hover:text-primario focus-visible:shadow-foco"
    >
      {label}
    </button>
  );
}
