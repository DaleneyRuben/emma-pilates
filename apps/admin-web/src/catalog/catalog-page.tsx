import type { UseQueryResult } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { isForbidden } from "../components/page/is-forbidden";
import { PageHeader } from "../components/page/page-header";
import { PageNotice } from "../components/page/page-notice";
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
  /** Absent on a list with no panel at all (AW25–AW27): rows open nothing. */
  panelTitles?: { create: string; edit: string | ((row: Row) => string) };
  /** A context line under the panel title (AW29: Client · Plan). */
  panelDescription?: (row: Row) => string;
  /** Rows that open a panel; a settled record is the whole row (AW28). */
  canOpen?: (row: Row) => boolean;
  filter: ReactNode;
  search: ListSearch;
  onPageChange: (page: number) => void;
  rangeLabel?: RangeLabel;
  query: UseQueryResult<{ items: Row[]; totalItems: number }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each accessor column carries its own value type.
  columns: (open: (row: Row) => void) => ColumnDef<Row, any>[];
  /** `done` closes the panel; a message becomes the page notice. */
  renderForm?: (
    row: Row | undefined,
    done: (notice?: string) => void,
  ) => ReactNode;
  /** More outlined header actions, each with its own panel (AW08). */
  panelActions?: readonly PanelAction[];
  /** Quiet text links after the actions (AW08's withdrawal history). */
  links?: ReactNode;
};

export type PanelAction = {
  label: string;
  render: (done: (notice?: string) => void) => ReactNode;
};

type PanelState<Row> =
  | { kind: "closed" }
  | { kind: "record"; row?: Row }
  | { kind: "action"; action: PanelAction };

/**
 * The list convention (design system → List pages): title and a "+ Nuevo …"
 * primary action (absent on read-only lists), optionally more actions with
 * their own panels and quiet links, one allowlisted filter, a
 * dense page-and-offset table whose rows open the record in the side panel.
 * The catalog pages and the People pages (WEB-004) share it; the oversight
 * lists (WEB-008) use it without a panel.
 */
export function CatalogPage<Row extends { id: string }>({
  title,
  subtitle,
  createLabel,
  loadingMessage,
  what,
  emptyMessage,
  panelTitles,
  panelDescription,
  canOpen,
  filter,
  search,
  onPageChange,
  rangeLabel,
  query,
  columns,
  renderForm,
  panelActions = [],
  links,
}: CatalogPageProps<Row>) {
  const [panel, setPanel] = useState<PanelState<Row>>({ kind: "closed" });
  const [notice, setNotice] = useState<string | null>(null);
  const show = (next: PanelState<Row>) => {
    setNotice(null);
    setPanel(next);
  };
  const open = (row?: Row) => show({ kind: "record", row });
  const close = () => setPanel({ kind: "closed" });
  const forbidden = isForbidden(query.error);
  const done = (message?: string) => {
    close();
    setNotice(message ?? null);
  };

  return (
    <article className="flex flex-col gap-5">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          forbidden ||
          (createLabel === undefined &&
            panelActions.length === 0 &&
            links === undefined) ? undefined : (
            <>
              {createLabel === undefined ? null : (
                <Button onClick={() => open()}>
                  <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
                  {createLabel}
                </Button>
              )}
              {panelActions.map((action) => (
                <Button
                  key={action.label}
                  variant="secondary"
                  onClick={() => show({ kind: "action", action })}
                >
                  {action.label}
                </Button>
              ))}
              {links}
            </>
          )
        }
      />
      {filter}
      {notice === null ? null : <PageNotice>{notice}</PageNotice>}
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
          onRowClick={renderForm === undefined ? undefined : open}
          canClickRow={canOpen}
          pagination={{
            page: search.page,
            pageSize: search.pageSize,
            totalItems: query.data.totalItems,
            onPageChange,
            rangeLabel,
          }}
        />
      )}
      {panelTitles === undefined || renderForm === undefined ? null : (
        <SidePanel
          open={panel.kind !== "closed"}
          onOpenChange={(next) => {
            if (!next) close();
          }}
          title={
            panel.kind === "action"
              ? panel.action.label
              : panel.kind === "closed" || panel.row === undefined
                ? panelTitles.create
                : typeof panelTitles.edit === "string"
                  ? panelTitles.edit
                  : panelTitles.edit(panel.row)
          }
          description={
            panel.kind === "record" && panel.row !== undefined
              ? panelDescription?.(panel.row)
              : undefined
          }
        >
          {panel.kind === "record" ? (
            <div key={panel.row?.id ?? "new"} className="flex flex-1 flex-col">
              {renderForm(panel.row, done)}
            </div>
          ) : panel.kind === "action" ? (
            <div key={panel.action.label} className="flex flex-1 flex-col">
              {panel.action.render(done)}
            </div>
          ) : null}
        </SidePanel>
      )}
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
