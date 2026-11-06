import type { AdministratorSessionRosterDto } from "@pilates/api-contracts";
import { http } from "msw";
import { apiUrl, jsonResponse } from "./msw";

export const rosterPath = (sessionId: string) =>
  `/api/v1/administrator/sessions/${sessionId}/roster`;
export const bookingsPath = (sessionId: string) =>
  `/api/v1/sessions/${sessionId}/bookings`;
export const waitlistPath = (sessionId: string) =>
  `/api/v1/sessions/${sessionId}/waitlist-entries`;

// WEB-039: who booked and who waits, per Session.
export const roster = (
  sessionId: string,
  bookings: string[] = [],
  waitlist: string[] = [],
): AdministratorSessionRosterDto => ({
  sessionId,
  bookings: bookings.map((clientName, index) => ({
    bookingId: `b1000000-0000-5000-8000-${String(index + 1).padStart(12, "0")}`,
    clientId: `c2000000-0000-5000-8000-${String(index + 1).padStart(12, "0")}`,
    clientName,
    clientPhoto: null,
    attendanceOutcome: null,
  })),
  waitlist: waitlist.map((clientName, index) => ({
    waitlistEntryId: `e1000000-0000-5000-8000-${String(index + 1).padStart(12, "0")}`,
    clientId: `c3000000-0000-5000-8000-${String(index + 1).padStart(12, "0")}`,
    clientName,
    clientPhoto: null,
    position: index + 1,
  })),
});

// Opening any Session reads its roster; unless a spec says otherwise, nobody
// has booked it yet.
export const emptyRosterHandler = () =>
  http.get(
    apiUrl("/api/v1/administrator/sessions/:sessionId/roster"),
    ({ params }) => jsonResponse(roster(String(params.sessionId))),
  );
