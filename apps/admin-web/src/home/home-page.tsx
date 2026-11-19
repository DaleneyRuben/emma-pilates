import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LoadingNotice } from "../components/page/query-failure";
import { buttonVariants } from "../components/ui/button";
import {
  boliviaMonth,
  boliviaToday,
  formatMonth,
  weekStartOf,
} from "../lib/bolivia-time";
import { useAdminRole } from "../session/admin-role";
import { staffProfileQueryOptions } from "../session/staff-profile-query";
import { useBranchSelection } from "../shell/branch/use-branch-selection";
import { ClientsCard, MoneyCard, TodayCard } from "./home-cards";
import { homeGreeting } from "./home-greeting";
import { HomeRecommendations } from "./home-recommendations";
import { pendingRows, type PendingRow } from "./home-pending";
import { usePendingCounts } from "./use-pending-counts";

// FIX-084 (Inicio A): «Por resolver» is one white list; only its first,
// most urgent row gets the solid button.
function PendingList({ rows }: { rows: readonly PendingRow[] }) {
  return (
    <section
      aria-labelledby="inicio-por-resolver"
      className="flex flex-col gap-2.5"
    >
      <h2 id="inicio-por-resolver" className="text-titulo-2 text-texto">
        Por resolver
      </h2>
      {rows.length === 0 ? (
        <p className="rounded-tarjeta border border-borde bg-blanco px-5 py-4 text-cuerpo text-texto-tenue">
          Todo al día: nada espera tu respuesta.
        </p>
      ) : (
        <ul className="flex flex-col rounded-tarjeta border border-borde bg-blanco">
          {rows.map((row, index) => (
            <li
              key={row.kind}
              className="flex min-h-16 items-center gap-3 border-t border-divisor px-4 py-3 first:border-t-0 md:px-5"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium text-texto">{row.title}</span>
                <span className="text-nota text-texto-tenue">{row.note}</span>
              </span>
              <Link
                to={row.to}
                data-emphasis={index === 0 ? "primary" : "outline"}
                className={buttonVariants({
                  variant: index === 0 ? "primary" : "outline",
                  size: "sm",
                })}
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
// (one column at 420 px). FIX-084 (Inicio A): what waits first, then two
// quiet cards and the grouped recommendations.
export function HomePage() {
  const { data: profile } = useQuery(staffProfileQueryOptions());
  const role = useAdminRole();
  const seesMoney =
    role === "administrator" &&
    (profile === undefined || profile.role === "administrator");
  const { selectedBranch, status: branchStatus } = useBranchSelection();
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
    <div className="flex max-w-[1080px] flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-titulo-1 text-texto lg:text-titulo-pagina-grande">
          {title}
        </h1>
        <p className="text-cuerpo text-texto-tenue">
          {selectedBranch === undefined
            ? day
            : `${day} · Sucursal ${selectedBranch.name}`}
        </p>
      </div>
      {counts.loading || branchStatus === "pending" ? (
        <LoadingNotice>Cargando el inicio…</LoadingNotice>
      ) : (
        <>
          <PendingList rows={rows} />
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
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
          <HomeRecommendations month={month} readOnly={!seesMoney} />
        </>
      )}
    </div>
  );
}
