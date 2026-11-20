import { formatMoney } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { countFormat } from "../components/table/pagination";
import { TextLink } from "../components/ui/text-link";
import { monthKpisQueryOptions } from "../indicators/indicator-queries";
import { boliviaParts } from "../lib/bolivia-time";
import { incomeReportQueryOptions } from "../report/report-queries";
import { weekSessionsQueryOptions } from "../schedule/schedule-queries";
import { cn } from "../lib/cn";
import { todaySummary } from "./home-pending";

// Rosa Emma (RW-inicio): a white card with its `etiqueta` label and its
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
          ? "bg-destacado text-sobre-primario shadow-destacado"
          : "bg-superficie text-texto shadow-tarjeta",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="tipo-etiqueta">
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
      <span className="tipo-cifra text-texto">{value}</span>
      <span className="tipo-secundario text-texto">{label}</span>
    </span>
  );
}

/**
 * P01's «Hoy», FIX-084 (Inicio A): today's classes at the selected Branch,
 * their bookings and occupancy as three figures, then each class with its
 * time as a figure (follow-up 285).
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
        <TextLink asChild>
          <Link to="/horario">Ver horario</Link>
        </TextLink>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <Figure
          value={countFormat.format(day.classes)}
          label={day.classes === 1 ? "clase" : "clases"}
        />
        <Figure
          value={countFormat.format(day.bookings)}
          label={day.bookings === 1 ? "reserva" : "reservas"}
        />
        <Figure
          value={
            day.occupancyPercent === null ? "—" : `${day.occupancyPercent} %`
          }
          label="ocupación"
        />
      </div>
      {day.classes === 0 ? (
        <p className="tipo-compacto text-texto">Sin clases hoy.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-texto">
          {day.sessions.map((session) => (
            <li key={session.id} className="flex items-baseline gap-3">
              <span className="tipo-cifra">
                {boliviaParts(session.startsAt).time}
              </span>
              <span className="tipo-compacto tabular">
                {`${session.classTypeName} · ${session.trainerName} (${session.bookedCount} de ${session.capacity})`}
              </span>
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
        <TextLink asChild className="text-sobre-primario">
          <Link to="/dinero/pagos">Ver pagos</Link>
        </TextLink>
      }
    >
      {income.data === undefined ? (
        <p className="tipo-compacto">
          {income.isError
            ? "No pudimos cargar lo cobrado."
            : "Cargando lo cobrado…"}
        </p>
      ) : (
        <>
          <span className="tipo-cifra-grande">
            {formatMoney(income.data.totalCentavos)}
          </span>
          <span className="tipo-cuerpo tabular">
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
        <TextLink asChild>
          <Link to="/clientas">Ver clientas</Link>
        </TextLink>
      }
    >
      {kpis.data === undefined ? (
        <p className="tipo-compacto text-texto">
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
