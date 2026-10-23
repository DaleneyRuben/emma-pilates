import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { isForbidden } from "../components/page/is-forbidden";
import { NoBranchPage } from "../components/page/no-branch-page";
import { PageHeader } from "../components/page/page-header";
import { PageNotice } from "../components/page/page-notice";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { Button } from "../components/ui/button";
import { WeekStepper } from "../components/table/week-stepper";
import { addDays, boliviaToday, weekStartOf } from "../lib/bolivia-time";
import type { Branch } from "../shell/branch/branch-context";
import { useBranchSelection } from "../shell/branch/use-branch-selection";
import { useIsNarrowViewport } from "../shell/use-media-query";
import { DayList } from "./day-list";
import {
  EquipmentFlagsContext,
  weekFlagsQueryOptions,
} from "./equipment-flag-data";
import { EquipmentFlagsNotice } from "./equipment-flags";
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
function BranchSchedule({
  branch,
  search,
  onWeekChange,
}: {
  branch: Branch;
  search: ScheduleSearch;
  onWeekChange: (week: string) => void;
}) {
  const today = boliviaToday();
  const monday = weekStartOf(search.week ?? today);
  const narrow = useIsNarrowViewport();
  const [panel, setPanel] = useState<SessionPanelState>({ mode: "closed" });
  const [notice, setNotice] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const sessions = useQuery(weekSessionsQueryOptions(branch.id, monday));
  // BKO-004: a failed read only hides the flags; the week stays usable.
  const flags = useQuery(weekFlagsQueryOptions(branch.id, monday));
  const flagged = useMemo(
    () => new Map((flags.data ?? []).map((flag) => [flag.sessionId, flag])),
    [flags.data],
  );

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
  const count = sessions.data?.length ?? 0;

  return (
    <article className="flex flex-col gap-5">
      <PageHeader
        title="Horario"
        subtitle={
          sessions.isSuccess
            ? `Sucursal ${branch.name} · sala única · ${sessionCount(count)}`
            : `Sucursal ${branch.name} · sala única`
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
      <WeekStepper monday={monday} today={today} onChange={onWeekChange} />
      {notice === null ? null : <PageNotice>{notice}</PageNotice>}
      {sessions.isSuccess ? (
        <EquipmentFlagsNotice flags={flags.data ?? []} />
      ) : null}
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
          <EquipmentFlagsContext.Provider value={flagged}>
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
                onCreate={(start) => {
                  setNotice(null);
                  setPanel({ mode: "create", start });
                }}
              />
            )}
          </EquipmentFlagsContext.Provider>
        </>
      )}
      <SessionPanel
        state={panel}
        branch={branch}
        onClose={() => setPanel({ mode: "closed" })}
        onDone={(message) => {
          setPanel({ mode: "closed" });
          setNotice(message);
        }}
      />
    </article>
  );
}

// The week's placeholder keeps the previous week on screen while the next
// one loads, so the page is remounted per Branch: a Branch switch starts
// from its loading line, like every other Branch-scoped page.
export function SchedulePage({
  search,
  onWeekChange,
}: {
  search: ScheduleSearch;
  onWeekChange: (week: string) => void;
}) {
  const { selectedBranch, status } = useBranchSelection();
  if (selectedBranch === undefined) {
    return (
      <NoBranchPage
        title="Horario"
        pending={status === "pending"}
        loadingMessage="Cargando el horario…"
        emptyMessage="Todavía no hay sucursales activas. Crea una en Sucursales para armar su horario."
      />
    );
  }
  return (
    <BranchSchedule
      key={selectedBranch.id}
      branch={selectedBranch}
      search={search}
      onWeekChange={onWeekChange}
    />
  );
}
