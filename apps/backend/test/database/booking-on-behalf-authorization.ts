import type { MatrixRow } from './authorization-matrix';

const both: MatrixRow = { administrator: 'allow', coordinator: 'allow' };

// Bookings on a Client's behalf: the Coordinator like the Assistant, and
// the Administrator from Horario, both at every Branch (ADR-0108). Horario
// books through the admin web's cookie (FIX-058, walkthrough finding 77).
export const bookingOnBehalfAuthorizationRows = (): Record<
  string,
  MatrixRow
> => ({
  'GET /api/v1/sessions': both,
  'GET /api/v1/sessions/{sessionId}': both,
  'POST /api/v1/sessions/{sessionId}/bookings': {
    ...both,
    realIds: true,
    cookie: true,
    body: (ids) => ({ clientId: ids.clientId }),
  },
  'POST /api/v1/sessions/{sessionId}/waitlist-entries': {
    ...both,
    realIds: true,
    cookie: true,
    body: (ids) => ({ clientId: ids.clientId }),
  },
  'DELETE /api/v1/bookings/{bookingId}': { ...both, realIds: true },
  'POST /api/v1/bookings/{bookingId}/reschedule': {
    ...both,
    realIds: { bookingId: 'rescheduleBookingId' },
    body: (ids) => ({ targetSessionId: ids.otherSessionId }),
  },
  'DELETE /api/v1/waitlist-entries/{waitlistEntryId}': {
    ...both,
    realIds: true,
  },
});
