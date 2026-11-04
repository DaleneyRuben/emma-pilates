import type { MatrixRow } from './authorization-matrix';

const both: MatrixRow = { administrator: 'allow', coordinator: 'allow' };

// The schedule and its Sessions run by both Roles (ADR-0102, ADR-0108).
export const scheduleAuthorizationRows = (): Record<string, MatrixRow> => ({
  'GET /api/v1/administrator/session-schedules': both,
  'POST /api/v1/administrator/session-schedules': both,
  'POST /api/v1/administrator/session-schedules/{scheduleId}/replacement': both,
  'POST /api/v1/administrator/session-schedules/{scheduleId}/end': both,
  'POST /api/v1/administrator/session-schedules/batch': both,
  // BKM-018: pause a weekly series and resume it.
  'POST /api/v1/administrator/session-schedules/{scheduleId}/pause': both,
  'POST /api/v1/administrator/session-schedules/{scheduleId}/resume': both,
  'POST /api/v1/administrator/sessions': both,
  'GET /api/v1/administrator/sessions': both,
  'PATCH /api/v1/administrator/sessions/{sessionId}': both,
  'POST /api/v1/administrator/sessions/{sessionId}/cancel': both,
  // WEB-039: who booked a class and who waits, for Horario's class panel.
  'GET /api/v1/administrator/sessions/{sessionId}/roster': {
    ...both,
    realIds: true,
  },
});
