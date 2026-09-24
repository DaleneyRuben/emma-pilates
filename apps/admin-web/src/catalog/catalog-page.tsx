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
import type { RangeLabel } from "../components/table/table-pagination";
import { Button } from "../components/ui/button";

type CatalogPageProps<Row extends { id: string }> = {
  title: string;
  subtitle?: ReactNode;
  /** The "+ Nuevo …" action; a read-only list (AW21) has none. */
  createLabel?: string;
  loadingMessage: string;
  /** Completes "No pudimos cargar …". */
  what: string;
  emptyMessage: ReactNode;
  panelTitles: { create: string; edit: string | ((row: Row) => string) };
  filter: ReactNode;
  search: ListSearch;
  onPageChange: (page: number) => void;
  rangeLabel?: RangeLabel;
  query: UseQueryResult<{ items: Row[]; totalItems: number }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each accessor column carries its own value type.
  columns: (open: (row: Row) => void) => ColumnDef<Row, any>[];
  renderForm: (row: Row | undefined, done: () => void) => ReactNode;
};

type PanelState<Row> = { open: false } | { open: true; row?: Row };

/**
 * The list convention (design system → List pages): title and a "+ Nuevo …"
 * primary action (absent on read-only lists), one allowlisted filter, a
 * dense page-and-offset table whose rows open the record in the side panel.
 * The catalog pages and the People pages (WEB-004) share it.
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
  rangeLabel,
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
          createLabel === undefined || isForbidden(query.error) ? undefined : (
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
            rangeLabel,
          }}
        />
      )}
      <SidePanel
        open={panel.open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title={
          !panel.open || panel.row === undefined
            ? panelTitles.create
            : typeof panelTitles.edit === "string"
              ? panelTitles.edit
              : panelTitles.edit(panel.row)
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
