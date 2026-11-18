import { useQuery } from "@tanstack/react-query";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { formatBolivianos } from "../lib/money";
import { formatMonth } from "../lib/bolivia-time";
import { revenueReportQueryOptions } from "./report-queries";

const countFormat = new Intl.NumberFormat("es-BO");

function Figure({ name, figure }: { name: string; figure: string }) {
  return (
    <section
      aria-label={name}
      className="flex flex-col gap-1 rounded-marco bg-lino px-5 py-4"
    >
      <h3 className="font-sans text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
        {name}
      </h3>
      <p className="font-serif text-[28px] leading-tight text-texto tabular">
        {figure}
      </p>
    </section>
  );
}

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
      <h2 className="font-serif text-seccion text-texto">
        {`Ingreso devengado · ${formatMonth(month)}`}
      </h2>
      {branchName === undefined ? null : (
        <p className="text-nota text-texto-tenue">
          {branchName === ""
            ? "Todo el estudio: no se separa por sucursal."
            : `Todo el estudio, no solo ${branchName}: no se separa por sucursal.`}
        </p>
      )}
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
            <Figure
              name="Caja"
              figure={formatBolivianos(revenue.data.cashCentavos)}
            />
            <Figure
              name="Devengado"
              figure={formatBolivianos(revenue.data.accruedCentavos)}
            />
            <Figure
              name="Diferido"
              figure={formatBolivianos(revenue.data.deferredCentavos)}
            />
          </div>
          <p className="text-nota text-texto-tenue">
            {`Clases pendientes de dar hoy: ${countFormat.format(revenue.data.classesStillOwed)}`}
          </p>
        </>
      )}
    </section>
  );
}
