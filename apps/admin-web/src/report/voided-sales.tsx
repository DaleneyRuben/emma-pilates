import type { VoidedIncomeDto } from "@pilates/api-contracts";
import { formatCivilMoment } from "../lib/bolivia-time";
import { formatBolivianos } from "../lib/money";

type VoidedSale = VoidedIncomeDto;

// A voided sale leaves the income totals and stays visible with its reason.
export function VoidedSales({
  sales,
}: {
  sales: VoidedSale[];
}) {
  if (sales.length === 0) return null;
  return (
    <section
      aria-label="Ventas anuladas"
      className="flex flex-col gap-2 rounded-tarjeta border border-borde bg-blanco px-4 py-3"
    >
      <h2 className="text-nota font-medium text-texto">Ventas anuladas</h2>
      <p className="text-ayuda text-texto-tenue">
        Fuera de los totales. Una anulación corrige un error y no devuelve dinero.
      </p>
      <ul className="flex flex-col gap-2">
        {sales.map((sale) => (
          <li key={sale.paymentId} className="flex flex-wrap justify-between gap-2 text-nota">
            <span>{sale.voidReason}</span>
            <span className="text-texto-tenue tabular">
              {formatBolivianos(sale.amountDueCentavos)} · {formatCivilMoment(sale.voidedAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
