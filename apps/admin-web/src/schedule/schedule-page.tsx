import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { isForbidden } from "../components/page/is-forbidden";
import { PageHeader } from "../components/page/page-header";
import { PageNotice } from "../components/page/page-notice";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { Button } from "../components/ui/button";
import {
  addDays,
  boliviaToday,
  formatWeekRange,
  weekStartOf,
} from "../lib/bolivia-time";
import { useBranchSelection } from "../shell/branch/use-branch-selection";
import { useIsNarrowViewport } from "../shell/use-media-query";
import { DayList } from "./day-list";
import { weekSessionLimit, weekSessionsQueryOptions } from "./schedule-queries";
import type { ScheduleSearch } from "./schedule-search";
import { SessionPanel, type SessionPanelState } from "./session-panel";
import { WeekGrid } from "./week-grid";

type Session = AdministratorSessionAvailabilityDto;
const sessionCount = (count: number) =>
  count === 1 ? "1 sesión esta semana" : `${count} sesiones esta semana`;

// AW02: the selected Branch's week in Bolivia time (ADR-0057). Sessions,
// not schedules, are drawn: a weekly schedule shows up through the Sessions
// it has materialized up to 30 days ahead (ADR-0059).
export function SchedulePage({
  search,
  onWeekChange,
}: {
  search: ScheduleSearch;
  onWeekChange: (week: string) => void;
}) {
  const today = boliviaToday();
  const monday = weekStartOf(search.week ?? today);
  const narrow = useIsNarrowViewport();
  const { selectedBranch, status: branchStatus } = useBranchSelection();
  const [panel, setPanel] = useState<SessionPanelState>({ mode: "closed" });
  const [notice, setNotice] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const sessions = useQuery({
    ...weekSessionsQueryOptions(selectedBranch?.id ?? "", monday),
    enabled: selectedBranch !== undefined,
  });

  const shownDay =
    day !== null && day >= monday && day < addDays(monday, 7)
      ? day
      : today >= monday && today < addDays(monday, 7)
        ? today
        : monday;
  const openSession = (session: Session) => {
    setNotice(null);
    setPanel({ mode: "edit", session });
  };

  if (selectedBranch === undefined) {
    return (
      <article className="flex flex-col gap-5">
        <PageHeader title="Horario" />
        {branchStatus === "pending" ? (
          <LoadingNotice>Cargando el horario…</LoadingNotice>
        ) : (
          <p className="rounded-tarjeta border border-borde bg-blanco px-6 py-10 text-center text-cuerpo text-texto-secundario">
            Todavía no hay sucursales activas. Crea una en Sucursales para armar
            su horario.
          </p>
        )}
      </article>
    );
  }

  const count = sessions.data?.length ?? 0;

  return (
    <article className="flex flex-col gap-5">
      <PageHeader
        title="Horario"
        subtitle={
          sessions.isSuccess
            ? `Sucursal ${selectedBranch.name} · sala única · ${sessionCount(count)}`
            : `Sucursal ${selectedBranch.name} · sala única`
        }
        actions={
          isForbidden(sessions.error) ? undefined : (
            <Button
              onClick={() => {
                setNotice(null);
                setPanel({ mode: "create" });
              }}
            >
              <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
              Nueva sesión
            </Button>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="neutral"
          size="icon"
          aria-label="Semana anterior"
          onClick={() => onWeekChange(addDays(monday, -7))}
        >
          <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
        </Button>
        <Button
          variant="neutral"
          size="icon"
          aria-label="Semana siguiente"
          onClick={() => onWeekChange(addDays(monday, 7))}
        >
          <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
        </Button>
        <Button
          variant="neutral"
          size="sm"
          onClick={() => onWeekChange(weekStartOf(today))}
        >
          Hoy
        </Button>
        <p className="font-serif text-[17px] text-texto">
          {formatWeekRange(monday)}
        </p>
      </div>
      {notice === null ? null : <PageNotice>{notice}</PageNotice>}
      {sessions.isPending ? (
        <LoadingNotice>Cargando el horario…</LoadingNotice>
      ) : sessions.isError ? (
        <QueryFailure
          error={sessions.error}
          what="el horario"
          onRetry={() => void sessions.refetch()}
        />
      ) : (
        <>
          {count === 0 ? (
            <p className="text-nota text-texto-tenue">
              No hay sesiones programadas esta semana.
            </p>
          ) : null}
          {count >= weekSessionLimit ? (
            <p className="text-nota text-advertencia-texto">
              Se muestran las primeras {weekSessionLimit} sesiones de la semana.
            </p>
          ) : null}
          {narrow ? (
            <DayList
              monday={monday}
              today={today}
              day={shownDay}
              onDayChange={setDay}
              sessions={sessions.data}
              onOpen={openSession}
            />
          ) : (
            <WeekGrid
              monday={monday}
              today={today}
              sessions={sessions.data}
              onOpen={openSession}
            />
          )}
        </>
      )}
      <SessionPanel
        state={panel}
        branch={selectedBranch}
        onClose={() => setPanel({ mode: "closed" })}
        onDone={(message) => {
          setPanel({ mode: "closed" });
          setNotice(message);
        }}
      />
    </article>
  );
}
