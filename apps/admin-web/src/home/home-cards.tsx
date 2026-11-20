import { formatMoney } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { countFormat } from "../components/table/pagination";
import { monthKpisQueryOptions } from "../indicators/indicator-queries";
import { boliviaParts } from "../lib/bolivia-time";
import { incomeReportQueryOptions } from "../report/report-queries";
import { weekSessionsQueryOptions } from "../schedule/schedule-queries";
import { cn } from "../lib/cn";
import { todaySummary } from "./home-pending";

const asideLink =
  "text-nota font-bold underline underline-offset-[3px] hover:decoration-2";

const plural = (count: number, one: string, many: string) =>
  `${countFormat.format(count)} ${count === 1 ? one : many}`;

// Rosa Emma (RW-inicio): a white card with an 11 px uppercase label and its
// figure in Lora; the money card is the page's one Rosa profundo block.
export function SummaryCard({
  title,
  aside,
  strong = false,
  children,
}: {
  title: string;
  aside?: ReactNode;
  strong?: boolean;
  children: ReactNode;
}) {
  const id = `inicio-${title.replaceAll(" ", "-").toLowerCase()}`;
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex min-h-[130px] flex-col gap-1.5 rounded-tarjeta px-5 py-[22px]",
        strong
          ? "bg-destacado text-blanco shadow-destacado"
          : "bg-superficie text-texto shadow-tarjeta",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id={id}
          className="font-sans text-etiqueta font-bold tracking-[0.14em] uppercase"
        >
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex flex-col">
      <span className="font-serif text-titulo-1 text-texto tabular">
        {value}
      </span>
      <span className="text-nota text-texto">{label}</span>
    </span>
  );
}

/**
 * P01's «Hoy», FIX-084 (Inicio A): today's classes at the selected Branch,
 * their bookings and occupancy in one line, then each class.
 */
export function TodayCard({
  branch,
  today,
  monday,
}: {
  branch: { id: string; name: string };
  today: string;
  monday: string;
}) {
  const week = useQuery(weekSessionsQueryOptions(branch.id, monday));
  const day = todaySummary(week.data ?? [], today);
  return (
    <SummaryCard
      title="Hoy"
      aside={
        <Link to="/horario" className={asideLink}>
          Ver horario
        </Link>
      }
    >
      <p className="font-serif text-[28px] leading-tight text-texto tabular">
        {[
          plural(day.classes, "clase", "clases"),
          plural(day.bookings, "reserva", "reservas"),
          `${day.occupancyPercent === null ? "—" : `${day.occupancyPercent} %`} ocupación`,
        ].join(" · ")}
      </p>
      {day.classes === 0 ? (
        <p className="text-celda text-texto">Sin clases hoy.</p>
      ) : (
        <ul className="flex flex-col gap-0.5 text-celda text-texto">
          {day.sessions.map((session) => (
            <li key={session.id} className="tabular">
              {`${boliviaParts(session.startsAt).time} ${session.classTypeName} · ${session.trainerName} (${session.bookedCount} de ${session.capacity})`}
            </li>
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}

/** P01's «Cobrado hoy», FIX-084 (Inicio A): the Administrator's day. */
export function MoneyCard({
  today,
  pendingPayments,
}: {
  today: string;
  pendingPayments: number;
}) {
  const income = useQuery(
    incomeReportQueryOptions({ from: today, to: today }, undefined),
  );
  return (
    <SummaryCard
      title="Cobrado hoy"
      strong
      aside={
        <Link to="/dinero/pagos" className={asideLink}>
          Ver pagos
        </Link>
      }
    >
      {income.data === undefined ? (
        <p className="text-celda">
          {income.isError
            ? "No pudimos cargar lo cobrado."
            : "Cargando lo cobrado…"}
        </p>
      ) : (
        <>
          <span className="font-serif text-cifra-grande leading-tight tabular">
            {formatMoney(income.data.totalCentavos)}
          </span>
          <span className="text-cuerpo font-medium tabular">
            {[
              `Efectivo ${formatMoney(income.data.byMethod.cash)}`,
              `QR ${formatMoney(income.data.byMethod.transfer)}`,
              pendingPayments === 0
                ? "ninguno por revisar"
                : `${countFormat.format(pendingPayments)} QR por revisar, aún no cuentan`,
            ].join(" · ")}
          </span>
        </>
      )}
    </SummaryCard>
  );
}

/** P01b: the Coordinator's Clientas summary, counts only (ADR-0102). */
export function ClientsCard({ month }: { month: string }) {
  const kpis = useQuery(monthKpisQueryOptions(month));
  return (
    <SummaryCard
      title="Clientas"
      aside={
        <Link to="/clientas" className={asideLink}>
          Ver clientas
        </Link>
      }
    >
      {kpis.data === undefined ? (
        <p className="text-nota text-texto">
          {kpis.isError
            ? "No pudimos cargar las clientas."
            : "Cargando las clientas…"}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Figure
            value={countFormat.format(kpis.data.activeClients)}
            label="activas"
          />
          <Figure
            value={countFormat.format(kpis.data.newClients)}
            label="nuevas este mes"
          />
          <Figure value={`${kpis.data.renewalPercent} %`} label="renovación" />
        </div>
      )}
    </SummaryCard>
  );
}
