import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../generated/prisma/client';
import {
  recommendFromFacts,
  type RecommendationFinding,
  type RecommendationRule,
} from './recommend-from-facts';

export type StoredRecommendation = {
  id: string;
  rule: RecommendationRule;
  subject: string;
  period: string;
  detail: string;
  state: 'new' | 'seen' | 'dismissed' | 'resolved';
  // Walkthrough finding 107: who a finding is about, read when listed for
  // the page and never stored or handed to the narrative (STU-007).
  clientId?: string;
  clientName?: string;
  trainerName?: string;
  weekday?: number;
};

type FactSessionRow = {
  trainer_staff_member_id: string;
  session_date: Date;
  bookings_at_window_close: number;
};

type FactCancelledRow = {
  trainer_staff_member_id: string;
  session_date: Date;
  bookings_held: number;
};

type FactClientRow = {
  client_id: string;
  plan_days: number;
  classes_booked: number;
  classes_attended: number;
  renewed: boolean;
};

type RecommendationRow = {
  id: string;
  rule: string;
  subject: string;
  period: Date;
  detail: string;
  state: string;
  client_name?: string | null;
  trainer_name?: string | null;
};

const monthStart = (month: Date) =>
  new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));

const periodOf = (month: Date) => monthStart(month).toISOString().slice(0, 10);

const monthKey = (month: Date) => periodOf(month).slice(0, 7);

const asRule = (rule: string): RecommendationRule => {
  if (rule === 'weak_schedule' || rule === 'inactive_client') return rule;
  throw new Error(`unknown recommendation rule ${rule}`);
};

const asState = (state: string): StoredRecommendation['state'] => {
  if (
    state === 'new' ||
    state === 'seen' ||
    state === 'dismissed' ||
    state === 'resolved'
  ) {
    return state;
  }
  throw new Error(`unknown recommendation state ${state}`);
};

const subjectOf = (
  rule: RecommendationRule,
  row: RecommendationRow,
): Partial<StoredRecommendation> => {
  if (rule === 'inactive_client') {
    return row.client_name == null
      ? { clientId: row.subject }
      : { clientId: row.subject, clientName: row.client_name };
  }
  const weekday = Number(row.subject.split(':')[1]);
  return {
    ...(Number.isInteger(weekday) ? { weekday } : {}),
    ...(row.trainer_name == null ? {} : { trainerName: row.trainer_name }),
  };
};

const toStored = (row: RecommendationRow): StoredRecommendation => {
  const rule = asRule(row.rule);
  return {
    id: row.id,
    rule,
    subject: row.subject,
    period: row.period.toISOString().slice(0, 10),
    detail: row.detail,
    state: asState(row.state),
    ...subjectOf(rule, row),
  };
};

export const readRecommendations = async (
  prisma: PrismaClient,
  input: { month: Date },
): Promise<StoredRecommendation[]> => {
  const month = monthStart(input.month);
  const rows = await prisma.$queryRaw<RecommendationRow[]>`
    SELECT r.id, r.rule, r.subject, r.period, r.detail, r.state,
           c.name AS client_name, s.name AS trainer_name
    FROM studio.recommendations r
    LEFT JOIN booking.clients c
      ON r.rule = 'inactive_client' AND c.id::text = r.subject
    LEFT JOIN booking.staff_members s
      ON r.rule = 'weak_schedule'
      AND s.id::text = split_part(r.subject, ':', 1)
    WHERE r.deleted_at IS NULL
      AND r.period = ${month}::date
    ORDER BY r.rule, r.subject
  `;
  return rows.map(toStored);
};

const readFindings = async (
  prisma: PrismaClient,
  month: Date,
  today: Date,
): Promise<RecommendationFinding[]> => {
  const sessions = await prisma.$queryRaw<FactSessionRow[]>`
    SELECT trainer_staff_member_id, session_date, bookings_at_window_close
    FROM studio.session_facts
    WHERE deleted_at IS NULL
      AND session_date >= ${month}::date
      AND session_date < (${month}::date + INTERVAL '1 month')
  `;
  const cancelled = await prisma.$queryRaw<FactCancelledRow[]>`
    SELECT trainer_staff_member_id, session_date, bookings_held
    FROM studio.cancelled_session_facts
    WHERE deleted_at IS NULL
      AND session_date >= ${month}::date
      AND session_date < (${month}::date + INTERVAL '1 month')
  `;
  const clientMonths = await prisma.$queryRaw<FactClientRow[]>`
    SELECT client_id, plan_days, classes_booked, classes_attended, renewed
    FROM studio.client_month_facts
    WHERE deleted_at IS NULL
      AND month = ${month}::date
  `;
  return recommendFromFacts({
    sessions: [
      ...sessions.map((row) => ({
        trainerStaffMemberId: row.trainer_staff_member_id,
        sessionDate: row.session_date,
        bookingsAtWindowClose: Number(row.bookings_at_window_close),
      })),
      // Finding 107: a class cancelled for low demand counts too.
      ...cancelled.map((row) => ({
        trainerStaffMemberId: row.trainer_staff_member_id,
        sessionDate: row.session_date,
        bookingsAtWindowClose: Number(row.bookings_held),
        cancelledForMinimum: true,
      })),
    ],
    clientMonths: clientMonths.map((row) => ({
      clientId: row.client_id,
      month: monthKey(month),
      planDays: Number(row.plan_days),
      classesBooked: Number(row.classes_booked),
      classesAttended: Number(row.classes_attended),
      renewed: row.renewed,
    })),
    month,
    today,
  });
};

export const recomputeRecommendations = async (
  prisma: PrismaClient,
  input: { month: Date; today: Date },
): Promise<{ written: number }> => {
  const month = monthStart(input.month);
  const findings = await readFindings(prisma, month, input.today);
  const now = new Date();
  await prisma.$transaction(async (transaction) => {
    for (const finding of findings) {
      const live = await transaction.$queryRaw<{ id: string }[]>`
        SELECT id FROM studio.recommendations
        WHERE deleted_at IS NULL
          AND rule = ${finding.rule}
          AND subject = ${finding.subject}
          AND period = ${month}::date
      `;
      const existing = live[0];
      if (existing === undefined) {
        await transaction.$executeRaw`
          INSERT INTO studio.recommendations
            (id, rule, subject, period, detail, state, updated_at)
          VALUES (
            ${randomUUID()}::uuid,
            ${finding.rule},
            ${finding.subject},
            ${month}::date,
            ${finding.detail},
            'new',
            ${now}
          )
        `;
        continue;
      }
      // A finding that holds again after it was resolved is new again; a
      // dismissed one stays dismissed.
      await transaction.$executeRaw`
        UPDATE studio.recommendations
        SET detail = ${finding.detail},
            state = CASE WHEN state = 'resolved' THEN 'new' ELSE state END,
            updated_at = ${now}
        WHERE id = ${existing.id}::uuid
          AND deleted_at IS NULL
          AND (detail IS DISTINCT FROM ${finding.detail} OR state = 'resolved')
      `;
    }
    // A finding the facts no longer support (she booked, the schedule
    // filled) is resolved, so the month's list stays true.
    const found = findings.map(
      (finding) => `${finding.rule}|${finding.subject}`,
    );
    await transaction.$executeRaw`
      UPDATE studio.recommendations
      SET state = 'resolved', updated_at = ${now}
      WHERE deleted_at IS NULL
        AND period = ${month}::date
        AND state IN ('new', 'seen')
        AND NOT (rule || '|' || subject = ANY(${found}::text[]))
    `;
  });
  return { written: findings.length };
};

export const dismissRecommendation = async (
  prisma: PrismaClient,
  input: { id: string },
): Promise<StoredRecommendation | null> => {
  const rows = await prisma.$queryRaw<RecommendationRow[]>`
    UPDATE studio.recommendations
    SET state = 'dismissed', updated_at = CURRENT_TIMESTAMP
    WHERE id = ${input.id}::uuid
      AND deleted_at IS NULL
    RETURNING id, rule, subject, period, detail, state
  `;
  const row = rows[0];
  return row === undefined ? null : toStored(row);
};
