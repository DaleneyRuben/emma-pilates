import { useQuery } from "@tanstack/react-query";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { StatTile } from "../components/ui/stat-tile";
import { formatBolivianos } from "../lib/money";
import { formatMonth } from "../lib/bolivia-time";
import { revenueReportQueryOptions } from "./report-queries";

const countFormat = new Intl.NumberFormat("es-BO");

// STU-002: cash, accrued by validity days, and deferred, beside the cash
// report. Classes still owed are today's remaining allowance, not a month.
// It is studio-wide: beside one Branch's report it says so (finding 107).
// FIX-088: the page has one date filter, so it reads the month the report's
// Hasta falls in instead of stepping months of its own.
export function RevenueSection({
  month,
  active = true,
  branchName,
}: {
  month: string;
  active?: boolean;
  branchName?: string;
}) {
  const revenue = useQuery({
    ...revenueReportQueryOptions(month),
    enabled: active,
  });

  if (!active) {
    return null;
  }

  return (
    <section aria-label="Ingreso devengado" className="flex flex-col gap-3">
      <h2 className="tipo-titulo-seccion text-texto">
        {`Ingreso devengado · ${formatMonth(month)}`}
      </h2>
      {revenue.isError ? (
        <QueryFailure
          error={revenue.error}
          what="el ingreso devengado"
          onRetry={() => {
            void revenue.refetch();
          }}
        />
      ) : revenue.data === undefined ? (
        <LoadingNotice>Cargando el ingreso devengado…</LoadingNotice>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <StatTile
              label="Caja"
              figure={formatBolivianos(revenue.data.cashCentavos)}
            />
            <StatTile
              label="Devengado"
              figure={formatBolivianos(revenue.data.accruedCentavos)}
            />
            <StatTile
              label="Diferido"
              figure={formatBolivianos(revenue.data.deferredCentavos)}
            />
          </div>
          {/* Follow-up 285: the studio-wide note sits in the white card,
              never loose on the page 100 (rule 3). */}
          <div className="flex flex-col gap-1 rounded-tarjeta bg-superficie px-[18px] py-3 text-texto shadow-tarjeta">
            <p className="tipo-titulo-fila">
              {`Clases pendientes de dar hoy: ${countFormat.format(revenue.data.classesStillOwed)}`}
            </p>
            {branchName === undefined ? null : (
              <p className="tipo-secundario">
                {branchName === ""
                  ? "Todo el estudio: no se separa por sucursal."
                  : `Todo el estudio, no solo ${branchName}: no se separa por sucursal.`}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
