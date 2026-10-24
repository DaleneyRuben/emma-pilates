import { isoWeekday } from '../time/bolivia-time';

// STU-006 rules the fact tables can support. Session facts have a date and
// no start hour, so a weak schedule is trainer plus weekday, not a clock
// time. Client no-shows and plan expiry are not on client_month_facts, so
// those rules are not computed here. Inactive means the current month, a
// live plan, and no booking: the 7-day window needs a booking query this
// item does not add.

export type RecommendationRule = 'weak_schedule' | 'inactive_client';

export type RecommendationFinding = {
  rule: RecommendationRule;
  subject: string;
  period: string;
  detail: string;
};

export type RecommendationSession = {
  trainerStaffMemberId: string;
  sessionDate: Date;
  bookingsAtWindowClose: number;
};

export type RecommendationClientMonth = {
  clientId: string;
  month: string;
  planDays: number;
  classesBooked: number;
  classesAttended: number;
  renewed: boolean;
};

const weekdayNames = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

const periodOf = (month: Date) =>
  new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);

const monthKey = (month: Date) => periodOf(month).slice(0, 7);

const averageLabel = (total: number, count: number) => {
  const tenths = Math.round((10 * total) / count);
  const whole = Math.floor(tenths / 10);
  const fraction = tenths % 10;
  return fraction === 0 ? String(whole) : `${whole},${fraction}`;
};

const weakSchedules = (
  sessions: readonly RecommendationSession[],
  period: string,
): RecommendationFinding[] => {
  const groups = new Map<
    string,
    { trainerId: string; weekday: number; bookings: number[] }
  >();
  for (const session of sessions) {
    const weekday = isoWeekday(session.sessionDate);
    const key = `${session.trainerStaffMemberId}:${weekday}`;
    const group = groups.get(key) ?? {
      trainerId: session.trainerStaffMemberId,
      weekday,
      bookings: [],
    };
    group.bookings.push(session.bookingsAtWindowClose);
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter(
      (group) =>
        group.bookings.length >= 3 &&
        group.bookings.reduce((total, value) => total + value, 0) /
          group.bookings.length <
          3,
    )
    .sort(
      (left, right) =>
        left.trainerId.localeCompare(right.trainerId) ||
        left.weekday - right.weekday,
    )
    .map((group) => ({
      rule: 'weak_schedule' as const,
      subject: `${group.trainerId}:${group.weekday}`,
      period,
      detail: `Revisa el horario del ${weekdayNames[group.weekday % 7]}: promedia ${averageLabel(
        group.bookings.reduce((total, value) => total + value, 0),
        group.bookings.length,
      )} alumnas.`,
    }));
};

const inactiveClients = (
  clientMonths: readonly RecommendationClientMonth[],
  currentMonth: string,
  period: string,
): RecommendationFinding[] =>
  clientMonths
    .filter(
      (row) =>
        row.month === currentMonth &&
        row.planDays > 0 &&
        row.classesAttended === 0 &&
        row.classesBooked === 0,
    )
    .sort((left, right) => left.clientId.localeCompare(right.clientId))
    .map((row) => ({
      rule: 'inactive_client' as const,
      subject: row.clientId,
      period,
      detail:
        'Contacta a la clienta: tiene un plan vigente y no reservó este mes.',
    }));

export const recommendFromFacts = (input: {
  sessions: readonly RecommendationSession[];
  clientMonths: readonly RecommendationClientMonth[];
  month: Date;
  today: Date;
}): RecommendationFinding[] => {
  const period = periodOf(input.month);
  const current = monthKey(input.today);
  return [
    ...weakSchedules(input.sessions, period),
    ...inactiveClients(input.clientMonths, current, period),
  ];
};
