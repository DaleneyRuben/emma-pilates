import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { countFormat } from "../components/table/pagination";
import { monthKpisQueryOptions } from "../indicators/indicator-queries";
import { boliviaParts } from "../lib/bolivia-time";
import { incomeReportQueryOptions } from "../report/report-queries";
import { weekSessionsQueryOptions } from "../schedule/schedule-queries";
import { todaySummary } from "./home-pending";

// Walkthrough n.º 22: whole bolivianos on the summaries.
const wholeBolivianos = (centavos: number) =>
  `Bs ${countFormat.format(Math.round(centavos / 100))}`;

const asideLink =
  "text-nota font-medium text-primario-profundo hover:text-primario-presionado";

const plural = (count: number, one: string, many: string) =>
  `${countFormat.format(count)} ${count === 1 ? one : many}`;

export function SummaryCard({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const id = `inicio-${title.replaceAll(" ", "-").toLowerCase()}`;
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-2 rounded-tarjeta border border-borde bg-blanco px-5 py-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-nota font-normal text-texto-tenue">
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
      <span className="font-serif text-titulo-2 text-texto tabular">
        {value}
      </span>
      <span className="text-nota text-texto-tenue">{label}</span>
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
      <p className="text-cuerpo text-texto tabular">
        {[
          plural(day.classes, "clase", "clases"),
          plural(day.bookings, "reserva", "reservas"),
          `${day.occupancyPercent === null ? "—" : `${day.occupancyPercent} %`} ocupación`,
        ].join(" · ")}
      </p>
      {day.classes === 0 ? (
        <p className="text-celda text-texto-tenue">Sin clases hoy.</p>
      ) : (
        <ul className="flex flex-col gap-0.5 text-celda text-texto-secundario">
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
      aside={
        <Link to="/dinero/pagos" className={asideLink}>
          Ver pagos
        </Link>
      }
    >
      {income.data === undefined ? (
        <p className="text-celda text-texto-tenue">
          {income.isError
            ? "No pudimos cargar lo cobrado."
            : "Cargando lo cobrado…"}
        </p>
      ) : (
        <>
          <span className="text-cuerpo text-texto tabular">
            {wholeBolivianos(income.data.totalCentavos)}
          </span>
          <span className="text-celda text-texto-secundario tabular">
            {[
              `Efectivo ${wholeBolivianos(income.data.byMethod.cash)}`,
              `QR ${wholeBolivianos(income.data.byMethod.transfer)}`,
              pendingPayments === 0
                ? "ninguno por revisar"
                : `${countFormat.format(pendingPayments)} por revisar`,
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
        <p className="text-nota text-texto-tenue">
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
