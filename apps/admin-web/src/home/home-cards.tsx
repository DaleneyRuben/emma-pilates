import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { countFormat } from "../components/table/pagination";
import { StatusPill } from "../components/ui/status-pill";
import { monthKpisQueryOptions } from "../indicators/indicator-queries";
import { boliviaParts } from "../lib/bolivia-time";
import { cn } from "../lib/cn";
import { incomeReportQueryOptions } from "../report/report-queries";
import { weekSessionsQueryOptions } from "../schedule/schedule-queries";
import { todaySummary } from "./home-pending";

// Walkthrough n.º 22: whole bolivianos on the summaries.
const wholeBolivianos = (centavos: number) =>
  `Bs ${countFormat.format(Math.round(centavos / 100))}`;

const eyebrow =
  "font-sans text-pie font-medium tracking-[0.12em] text-texto-tenue uppercase";

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
      className="flex flex-col gap-3 rounded-marco bg-lino p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className={eyebrow}>
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
      <span className="font-serif text-[28px] leading-tight text-texto tabular">
        {value}
      </span>
      <span className="text-nota text-texto-tenue">{label}</span>
    </span>
  );
}

/** P01's «Hoy en …»: today's classes at the selected Branch. */
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
      title={`Hoy en ${branch.name}`}
      aside={
        <Link
          to="/horario"
          className="text-celda font-semibold text-primario-profundo hover:text-primario-presionado"
        >
          Ver horario
        </Link>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <Figure value={countFormat.format(day.classes)} label="clases" />
        <Figure value={countFormat.format(day.bookings)} label="reservas" />
        <Figure
          value={
            day.occupancyPercent === null ? "—" : `${day.occupancyPercent} %`
          }
          label="ocupación"
        />
      </div>
      {day.classes === 0 ? (
        <p className="text-nota text-texto-tenue">Sin clases hoy.</p>
      ) : (
        <ul className="flex flex-col border-t border-divisor">
          {day.sessions.slice(0, 3).map((session) => (
            <li
              key={session.id}
              className="flex items-center gap-3 border-b border-divisor py-2 last:border-b-0"
            >
              <span className="w-14 font-serif text-cuerpo-grande tabular">
                {boliviaParts(session.startsAt).time}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">
                  {session.classTypeName}
                </span>
                <span className="truncate text-pie text-texto-tenue">
                  {session.trainerName}
                </span>
              </span>
              {session.availableSeats === 0 ? (
                <StatusPill tone="neutral">Llena</StatusPill>
              ) : (
                <span className="text-celda text-texto-tenue tabular">
                  {session.bookedCount} de {session.capacity}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}

type Span = "hoy" | "mes";

/** P01's «Dinero · Todo el estudio» with Hoy | Mes; the Administrator's. */
export function MoneyCard({
  today,
  pendingPayments,
}: {
  today: string;
  pendingPayments: number;
}) {
  const [span, setSpan] = useState<Span>("hoy");
  const range = {
    from: span === "hoy" ? today : `${today.slice(0, 7)}-01`,
    to: today,
  };
  const income = useQuery(incomeReportQueryOptions(range, undefined));
  return (
    <SummaryCard
      title="Dinero"
      aside={
        <span className="flex gap-0.5 rounded-full bg-superficie p-[3px]">
          {(["hoy", "mes"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={span === option}
              onClick={() => setSpan(option)}
              className={cn(
                "h-[30px] rounded-full px-3 text-nota text-texto-tenue focus-visible:shadow-foco",
                span === option &&
                  "bg-primario-tinte font-semibold text-primario-profundo",
              )}
            >
              {option === "hoy" ? "Hoy" : "Mes"}
            </button>
          ))}
        </span>
      }
    >
      {income.data === undefined ? (
        <p className="text-nota text-texto-tenue">
          {income.isError
            ? "No pudimos cargar el dinero."
            : "Cargando el dinero…"}
        </p>
      ) : (
        <>
          <span className="font-serif text-[32px] leading-tight text-texto tabular">
            {wholeBolivianos(income.data.totalCentavos)}
          </span>
          <span className="text-nota text-texto-tenue">
            {span === "hoy" ? "Cobrado hoy" : "Cobrado este mes"} · todo el
            estudio
          </span>
          <dl className="flex flex-col border-t border-divisor pt-2 text-celda">
            <div className="flex justify-between py-1">
              <dt>Efectivo</dt>
              <dd className="tabular">
                {wholeBolivianos(income.data.byMethod.cash)}
              </dd>
            </div>
            <div className="flex justify-between py-1">
              <dt>QR confirmados</dt>
              <dd className="tabular">
                {wholeBolivianos(income.data.byMethod.transfer)}
              </dd>
            </div>
            <div className="flex justify-between py-1 text-advertencia-texto">
              <dt>QR por revisar (aún no cuenta)</dt>
              <dd className="tabular">{countFormat.format(pendingPayments)}</dd>
            </div>
          </dl>
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
        <Link
          to="/clientas"
          className="text-celda font-semibold text-primario-profundo hover:text-primario-presionado"
        >
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
