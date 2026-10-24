// STU-003 counts for one America/La_Paz month. Percents round half away
// from zero. Averages stay in tenths (times 10) so the page formats the
// decimal and this function never leaves integers. New means this month's
// fact has plan days and the client has no earlier fact with plan days.
// Renewal's denominator is active clients, not plans that expired: the
// fact table cannot see those.

export type SessionFactInput = {
  capacity: number;
  bookingsAtWindowClose: number;
  attended: number;
  noShows: number;
};

export type ClientMonthInput = {
  clientId: string;
  month: string;
  planDays: number;
  renewed: boolean;
};

export type MonthKpiCounts = {
  sessionsHeld: number;
  occupancyPercent: number;
  averageStudentsTimes10: number;
  averageAttendanceTimes10: number;
  noShowPercent: number;
  activeClients: number;
  newClients: number;
  renewedClients: number;
  renewalPercent: number;
};

const sum = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0);

const percent = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : Math.round((100 * numerator) / denominator);

const times10 = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : Math.round((10 * numerator) / denominator);

export const monthKpis = (input: {
  sessions: readonly SessionFactInput[];
  clientMonths: readonly ClientMonthInput[];
  earlierActiveClientIds: readonly string[];
}): MonthKpiCounts => {
  const sessionsHeld = input.sessions.length;
  const bookings = sum(
    input.sessions.map((session) => session.bookingsAtWindowClose),
  );
  const capacity = sum(input.sessions.map((session) => session.capacity));
  const attended = sum(input.sessions.map((session) => session.attended));
  const noShows = sum(input.sessions.map((session) => session.noShows));
  const active = input.clientMonths.filter((row) => row.planDays > 0);
  const earlier = new Set(input.earlierActiveClientIds);
  const renewedClients = active.filter((row) => row.renewed).length;

  return {
    sessionsHeld,
    occupancyPercent: percent(bookings, capacity),
    averageStudentsTimes10: times10(bookings, sessionsHeld),
    averageAttendanceTimes10: times10(attended, sessionsHeld),
    noShowPercent: percent(noShows, bookings),
    activeClients: active.length,
    newClients: active.filter((row) => !earlier.has(row.clientId)).length,
    renewedClients,
    renewalPercent: percent(renewedClients, active.length),
  };
};
