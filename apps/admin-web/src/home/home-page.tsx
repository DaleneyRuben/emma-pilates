import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { countFormat } from "../components/table/pagination";
import {
  boliviaMonth,
  boliviaToday,
  formatMonth,
  weekStartOf,
} from "../lib/bolivia-time";
import { RecommendationsSection } from "../recommendations/recommendations-page";
import { useAdminRole } from "../session/admin-role";
import { staffProfileQueryOptions } from "../session/staff-profile-query";
import { useBranchSelection } from "../shell/branch/use-branch-selection";
import { ClientsCard, MoneyCard, TodayCard } from "./home-cards";
import { homeGreeting } from "./home-greeting";
import { pendingRows, type PendingRow } from "./home-pending";
import { usePendingCounts } from "./use-pending-counts";

const eyebrow =
  "font-sans text-pie font-medium tracking-[0.12em] text-texto-tenue uppercase";

// P01's one Rosa profundo card: how many things wait, and what they are.
function PendingCard({ rows }: { rows: readonly PendingRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <section
      aria-labelledby="inicio-por-resolver"
      className="flex flex-col gap-2 rounded-hero bg-rosa-profundo p-5 text-blanco"
    >
      <h2
        id="inicio-por-resolver"
        className="font-sans text-pie font-medium tracking-[0.12em] text-blanco/75 uppercase"
      >
        Por resolver
      </h2>
      <span className="font-serif text-[32px] leading-tight">
        {total === 0
          ? "Todo al día"
          : `${countFormat.format(total)} ${total === 1 ? "pendiente" : "pendientes"}`}
      </span>
      <span className="text-celda text-blanco/85">
        {total === 0
          ? "Nada espera tu respuesta ahora."
          : rows.map((row) => row.title).join(" · ")}
      </span>
    </section>
  );
}

function PendingList({ rows }: { rows: readonly PendingRow[] }) {
  return (
    <section
      aria-labelledby="inicio-pendientes"
      className="flex flex-col gap-3"
    >
      <h2 id="inicio-pendientes" className={eyebrow}>
        Pendientes
      </h2>
      {rows.length === 0 ? (
        <p className="rounded-marco bg-lino px-6 py-10 text-center text-cuerpo text-texto-tenue">
          Nada por resolver.
        </p>
      ) : (
        <ul
          aria-label="Pendientes"
          className="flex flex-col rounded-marco bg-lino"
        >
          {rows.map((row) => (
            <li
              key={row.kind}
              className="flex min-h-16 items-center gap-3 border-t border-divisor px-5 py-2 first:border-t-0"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium text-texto">{row.title}</span>
                <span className="text-nota text-texto-tenue">{row.note}</span>
              </span>
              <Link
                to={row.to}
                className="inline-flex h-[36px] items-center rounded-tarjeta bg-primario-tinte px-3.5 text-celda font-semibold text-primario-profundo hover:bg-rosa-empolvado/40 focus-visible:shadow-foco"
              >
                Revisar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// P01 (Administrator), P01b (Coordinator), P01c (nothing pending), P01d
// (one column at 420 px).
export function HomePage() {
  const { data: profile } = useQuery(staffProfileQueryOptions());
  const role = useAdminRole();
  const seesMoney =
    role === "administrator" &&
    (profile === undefined || profile.role === "administrator");
  const { selectedBranch } = useBranchSelection();
  const { title, day } = homeGreeting(profile?.name ?? "");
  const today = boliviaToday();
  const month = boliviaMonth();
  const counts = usePendingCounts({
    seesMoney,
    branchId: selectedBranch?.id,
    month,
  });
  const rows = pendingRows(counts, {
    branchName: selectedBranch?.name,
    monthLabel: formatMonth(month),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-titulo-1 text-texto lg:text-[32px]">{title}</h1>
        <p className="text-cuerpo text-texto-tenue">
          {selectedBranch === undefined
            ? day
            : `${day} · Sucursal ${selectedBranch.name}`}
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <PendingCard rows={rows} />
        {selectedBranch === undefined ? null : (
          <TodayCard
            branch={selectedBranch}
            today={today}
            monday={weekStartOf(today)}
          />
        )}
        {seesMoney ? (
          <MoneyCard today={today} pendingPayments={counts.payments} />
        ) : (
          <ClientsCard month={month} />
        )}
      </div>
      <PendingList rows={rows} />
      <RecommendationsSection month={month} readOnly={!seesMoney} />
    </div>
  );
}
