import type { AdminSalaryPaymentDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { CatalogPage, RowOpener } from "../../catalog/catalog-page";
import type { SearchChange } from "../../catalog/catalog-search";
import { ListFilter } from "../../components/table/list-filter";
import { pageRangeLabel } from "../../components/table/pagination";
import { useKnownOption } from "../../components/table/use-known-option";
import { Button } from "../../components/ui/button";
import { formatCivilDate } from "../../lib/bolivia-time";
import { formatBolivianos } from "../../lib/money";
import { staffOptionLabel } from "./payroll-format";
import {
  payrollStaffQueryOptions,
  payrollTableQueryOptions,
} from "./payroll-queries";
import { ReceiptDialog } from "../../payments/receipt-dialog";
import type { PayrollSearch } from "./payroll-search";
import { SalaryPaymentPanelForm } from "./salary-payment-panel";

const columns = createColumnHelper<AdminSalaryPaymentDto>();

const payrollColumns = (open: (row: AdminSalaryPaymentDto) => void) => [
  columns.accessor("staffMemberName", {
    header: "Empleado",
    cell: ({ row }) => (
      <RowOpener
        label={row.original.staffMemberName}
        onOpen={() => open(row.original)}
      />
    ),
  }),
  columns.accessor("amountCentavos", {
    header: "Monto",
    meta: { align: "right" },
    cell: ({ getValue }) => (
      <span className="text-texto tabular">{formatBolivianos(getValue())}</span>
    ),
  }),
  columns.accessor("paidOn", {
    header: "Fecha",
    cell: ({ getValue }) => (
      <span className="text-texto-secundario tabular">
        {formatCivilDate(getValue())}
      </span>
    ),
  }),
  columns.accessor("receiptUrl", {
    header: "Comprobante",
    meta: { align: "right" },
    cell: ({ row, getValue }) => (
      <ReceiptCell url={getValue()} name={row.original.staffMemberName} />
    ),
  }),
];

// Follow-up 224: «Ver» opens AW29's enlarged viewer; «—» when there is none.
function ReceiptCell({ url, name }: { url: string | null; name: string }) {
  const [open, setOpen] = useState(false);
  if (url === null) return <span className="text-texto-muy-tenue">—</span>;
  // The row opens AW12 on a click, and React bubbles the dialog's portal
  // events through this cell, so neither may reach the row.
  return (
    <span
      className="contents"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Button
        variant="link"
        size="sm"
        aria-label={`Ver comprobante de ${name}`}
        onClick={() => setOpen(true)}
      >
        <ImageIcon size={14} strokeWidth={1.7} aria-hidden="true" />
        Ver
      </Button>
      <ReceiptDialog
        open={open}
        onOpenChange={setOpen}
        src={url}
        alt={`Comprobante de ${name}, ampliado`}
        caption={`Comprobante de ${name}`}
      />
    </span>
  );
}

// AW11: every Salary Payment of the studio. A payment covers all of a Staff
// Member's work, so payroll is never split by Branch (back-office/CONTEXT.md).
export function PayrollPage({
  search,
  onSearchChange,
}: {
  search: PayrollSearch;
  onSearchChange: SearchChange<PayrollSearch>;
}) {
  const query = useQuery(payrollTableQueryOptions(search));
  const staff = useQuery(payrollStaffQueryOptions());
  useKnownOption(search.staffMemberId, staff.data, () =>
    onSearchChange({ staffMemberId: undefined, page: 1 }),
  );

  return (
    <CatalogPage
      title="Nómina"
      subtitle="Todo el estudio · solo registra que el pago se hizo, no cómo se calculó."
      createLabel="Registrar pago"
      loadingMessage="Cargando pagos…"
      what="la nómina"
      emptyMessage={
        search.staffMemberId === undefined
          ? "Todavía no hay pagos registrados."
          : "No hay pagos registrados para esta persona."
      }
      panelTitles={{ create: "Registrar pago", edit: "Editar pago" }}
      filter={
        <ListFilter
          label="Empleado"
          value={search.staffMemberId ?? "all"}
          options={[
            { value: "all", label: "Todos" },
            ...(staff.data ?? []).map((member) => ({
              value: member.id,
              label: staffOptionLabel(member),
            })),
          ]}
          onChange={(value) =>
            onSearchChange({
              staffMemberId: value === "all" ? undefined : value,
              page: 1,
            })
          }
        />
      }
      search={search}
      onPageChange={(page) => onSearchChange({ page })}
      rangeLabel={(window) =>
        window.totalItems === 0
          ? pageRangeLabel(window)
          : `${pageRangeLabel(window)} ${window.totalItems === 1 ? "pago" : "pagos"}`
      }
      query={query}
      columns={payrollColumns}
      renderForm={(payment, done) => (
        <SalaryPaymentPanelForm payment={payment} onDone={done} />
      )}
    />
  );
}
