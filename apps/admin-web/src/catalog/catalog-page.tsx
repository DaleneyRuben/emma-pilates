import type { UseQueryResult } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { isForbidden } from "../components/page/is-forbidden";
import { PageHeader } from "../components/page/page-header";
import { PageNotice } from "../components/page/page-notice";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { SidePanel } from "../components/panel/side-panel";
import { DataTable } from "../components/table/data-table";
import { pageCount, type ListSearch } from "../components/table/pagination";
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
  /** FIX-089 (ListaC): a person list's circle in the phone card. */
  avatar?: (row: Row) => ReactNode;
  filter: ReactNode;
  search: ListSearch;
  onPageChange: (page: number) => void;
  /** Steps back from a page past the last one; `onPageChange` by default. */
  onPageClamp?: (page: number) => void;
  rangeLabel?: RangeLabel;
  query: UseQueryResult<{ items: Row[]; totalItems: number }>;
  /** `act` opens a panel action from a row (FIX-088's per-row links). */
  columns: (
    open: (row: Row) => void,
    act: (action: PanelAction) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each accessor column carries its own value type.
  ) => ColumnDef<Row, any>[];
  /** `done` closes the panel; a message becomes the page notice. */
  renderForm?: (
    row: Row | undefined,
    done: (notice?: string) => void,
  ) => ReactNode;
  /** More outlined header actions, each with its own panel (AW08). */
  panelActions?: readonly PanelAction[];
  /** Quiet text links after the actions (AW08's withdrawal history). */
  links?: ReactNode;
  /** A header action that is not a panel (AW21's campaign grant). */
  actions?: ReactNode;
  /** A summary under a loaded table (AW27's studio total). */
  footer?: ReactNode;
  /** A column beside the table from lg up, under it below (FIX-091 W11). */
  aside?: ReactNode;
  /** A row to open once the page lists it (a link from another page). */
  openRowId?: string;
  /**
   * Called once `openRowId` opened, or the loaded page does not list it, so
   * the address can forget it (replacing the history entry, not pushing).
   */
  onLinkSettled?: () => void;
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
  avatar,
  filter,
  search,
  onPageChange,
  onPageClamp = onPageChange,
  rangeLabel,
  query,
  columns,
  renderForm,
  panelActions = [],
  links,
  actions,
  footer,
  aside,
  openRowId,
  onLinkSettled,
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
  // A linked row opens once, while rendering (no effect-driven setState).
  const linked = query.data?.items.find((row) => row.id === openRowId);
  const [openedLink, setOpenedLink] = useState<string | undefined>();
  if (linked !== undefined && openedLink !== linked.id) {
    setOpenedLink(linked.id);
    setNotice(null);
    setPanel({ kind: "record", row: linked });
  } else if (openRowId === undefined && openedLink !== undefined) {
    setOpenedLink(undefined);
  }
  const linkMissing =
    openRowId !== undefined &&
    query.isSuccess &&
    !query.isPlaceholderData &&
    linked === undefined;
  useEffect(() => {
    if (openedLink !== undefined || linkMissing) onLinkSettled?.();
  }, [openedLink, linkMissing, onLinkSettled]);
  // FIX-090: an address past the last page of a list with rows steps back
  // to it, so it never reads «Página 2 de 1» over the empty message.
  const lastPage =
    query.data === undefined ||
    query.isPlaceholderData ||
    query.data.totalItems === 0
      ? undefined
      : pageCount(query.data.totalItems, search.pageSize);
  useEffect(() => {
    if (lastPage !== undefined && search.page > lastPage) {
      onPageClamp(lastPage);
    }
  }, [lastPage, search.page, onPageClamp]);

  // W4: an empty page kept from the previous filter is not the new filter's
  // answer, so it reads as loading rather than as that filter's empty state.
  const waiting =
    query.isPending ||
    (query.isPlaceholderData && query.data.items.length === 0);
  const listing = waiting ? (
    <LoadingNotice>{loadingMessage}</LoadingNotice>
  ) : query.isError ? (
    <QueryFailure
      error={query.error}
      what={what}
      onRetry={() => void query.refetch()}
    />
  ) : (
    <>
      <DataTable
        columns={columns(open, (action) => show({ kind: "action", action }))}
        rows={query.data.items}
        rowId={(row) => row.id}
        emptyMessage={emptyMessage}
        onRowClick={renderForm === undefined ? undefined : open}
        canClickRow={canOpen}
        avatar={avatar}
        pagination={{
          page: search.page,
          pageSize: search.pageSize,
          totalItems: query.data.totalItems,
          onPageChange,
          rangeLabel,
        }}
      />
      {footer}
    </>
  );

  return (
    <article className="flex flex-col gap-5">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          forbidden ||
          (createLabel === undefined &&
            panelActions.length === 0 &&
            links === undefined &&
            actions === undefined) ? undefined : (
            <>
              {actions}
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
              {/* Follow-up 233: the one primary action sits last, on the right. */}
              {createLabel === undefined ? null : (
                <Button onClick={() => open()}>
                  <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
                  {createLabel}
                </Button>
              )}
            </>
          )
        }
      />
      {filter}
      {notice === null ? null : <PageNotice>{notice}</PageNotice>}
      {aside === undefined ? (
        listing
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex min-w-0 flex-col gap-5">{listing}</div>
          {aside}
        </div>
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
      className="rounded-control text-left tipo-titulo-fila text-texto focus-visible:shadow-foco"
    >
      {label}
    </button>
  );
}
