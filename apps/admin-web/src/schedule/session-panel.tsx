import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { SidePanel } from "../components/panel/side-panel";
import { Button } from "../components/ui/button";
import type { Branch } from "../shell/branch/branch-context";
import { formatSessionMoment } from "../lib/bolivia-time";
import { BookClientForm } from "./book-client-form";
import { SessionCreateForm, type SessionStart } from "./session-create-form";
import { SessionDetail } from "./session-detail";
import { seatsTaken } from "./session-seats";
import { sessionRosterQueryOptions } from "./session-roster-queries";

type Session = AdministratorSessionAvailabilityDto;

export type SessionPanelState =
  | { mode: "closed" }
  | { mode: "create"; start?: SessionStart }
  | { mode: "edit"; session: Session };

// AW03: "8 de 10 lugares reservados · 3 en lista de espera" (invariant 4).
const occupancyLine = (session: Session) =>
  [
    formatSessionMoment(session.startsAt),
    `${session.bookedCount} de ${session.capacity} lugares reservados`,
    ...(session.waitlistCount > 0
      ? [`${session.waitlistCount} en lista de espera`]
      : []),
  ].join(" · ");

// WEB-039: «Reservar a una clienta» replaces the class detail inside the
// panel, with a way back; the success notice then shows on the detail.
function BookingView({
  session,
  branchId,
  onBack,
  onBooked,
}: {
  session: Session;
  branchId: string;
  onBack: () => void;
  onBooked: (notice: string) => void;
}) {
  const roster = useQuery(sessionRosterQueryOptions(session.id));
  const waiting = roster.data?.waitlist.length ?? session.waitlistCount;

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-5">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />
          Volver a la clase
        </Button>
      </div>
      <BookClientForm
        session={session}
        branchId={branchId}
        full={
          seatsTaken(session, roster.data?.bookings.length) >= session.capacity
        }
        nextPosition={waiting + 1}
        onBooked={onBooked}
      />
    </div>
  );
}

// AW03: the side panel over the week, so the Administrator keeps their place.
export function SessionPanel({
  state,
  branch,
  onClose,
  onDone,
}: {
  state: SessionPanelState;
  branch: Branch;
  onClose: () => void;
  onDone: (notice: string | null) => void;
}) {
  // Both are tied to the Session they were made on, so opening another
  // Session starts from its detail with no notice.
  const [bookingFor, setBookingFor] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ id: string; text: string } | null>(
    null,
  );
  const session = state.mode === "edit" ? state.session : null;
  const booking = session !== null && bookingFor === session.id;

  const close = () => {
    setBookingFor(null);
    setNotice(null);
    onClose();
  };

  return (
    <SidePanel
      open={state.mode !== "closed"}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={
        session === null
          ? "Nueva sesión"
          : booking
            ? "Reservar a una clienta"
            : "Editar sesión"
      }
      description={
        session === null
          ? `Sucursal ${branch.name} · sala única`
          : booking
            ? `${session.classTypeName} · ${formatSessionMoment(session.startsAt)}`
            : occupancyLine(session)
      }
    >
      {state.mode === "create" ? (
        <SessionCreateForm
          key={state.start ? `${state.start.date} ${state.start.time}` : "new"}
          branchId={branch.id}
          start={state.start}
          onDone={onDone}
        />
      ) : null}
      {session !== null && booking ? (
        <BookingView
          key={session.id}
          session={session}
          branchId={branch.id}
          onBack={() => setBookingFor(null)}
          onBooked={(text) => {
            setBookingFor(null);
            setNotice({ id: session.id, text });
          }}
        />
      ) : null}
      {session !== null && !booking ? (
        <SessionDetail
          key={session.id}
          session={session}
          branchId={branch.id}
          notice={notice?.id === session.id ? notice.text : null}
          onBook={() => {
            setNotice(null);
            setBookingFor(session.id);
          }}
          onDone={(message) => {
            setNotice(null);
            onDone(message);
          }}
        />
      ) : null}
    </SidePanel>
  );
}
