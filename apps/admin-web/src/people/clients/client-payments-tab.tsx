import { formatDateTime } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { formatBolivianos } from "../../lib/money";
import { methodLabels } from "../../payments/payments-csv";
import { PaymentStatePill } from "../../payments/payment-state-pill";
import { clientPaymentsQueryOptions } from "./client-file-queries";
import { ClientFileItem, ClientFileSection } from "./client-file-list";

// P03 Pagos, the Administrator's alone (ADR-0102, ADR-0108): her latest
// sales, each reviewed or voided on Dinero › Pagos.
export function ClientPaymentsTab({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const payments = useQuery(clientPaymentsQueryOptions(clientId));
  return (
    <>
      <ClientFileSection
        title="Pagos"
        query={payments}
        what="sus pagos"
        loading="Cargando sus pagos…"
        empty="Todavía no tiene pagos."
      >
        {(page) =>
          page.items.map((payment) => (
            <ClientFileItem
              key={payment.id}
              title={payment.planName}
              detail={`${formatDateTime(payment.submittedAt)} · ${methodLabels[payment.method]}`}
              aside={
                <span className="flex flex-col items-end gap-1">
                  <span className="font-serif text-fila text-texto tabular">
                    {formatBolivianos(payment.amountDueCentavos)}
                  </span>
                  <PaymentStatePill state={payment.state} />
                </span>
              }
            />
          ))
        }
      </ClientFileSection>
      <Link
        to="/dinero/pagos"
        search={{ page: 1, pageSize: 20, status: "all", q: clientName }}
        className="self-start rounded-control text-nota font-medium text-rosa-enlace hover:underline focus-visible:shadow-foco"
      >
        Ver en Dinero
      </Link>
    </>
  );
}
