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
};

type FactSessionRow = {
  trainer_staff_member_id: string;
  session_date: Date;
  bookings_at_window_close: number;
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

const toStored = (row: RecommendationRow): StoredRecommendation => ({
  id: row.id,
  rule: asRule(row.rule),
  subject: row.subject,
  period: row.period.toISOString().slice(0, 10),
  detail: row.detail,
  state: asState(row.state),
});

export const readRecommendations = async (
  prisma: PrismaClient,
  input: { month: Date },
): Promise<StoredRecommendation[]> => {
  const month = monthStart(input.month);
  const rows = await prisma.$queryRaw<RecommendationRow[]>`
    SELECT id, rule, subject, period, detail, state
    FROM studio.recommendations
    WHERE deleted_at IS NULL
      AND period = ${month}::date
    ORDER BY rule, subject
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
  const clientMonths = await prisma.$queryRaw<FactClientRow[]>`
    SELECT client_id, plan_days, classes_booked, classes_attended, renewed
    FROM studio.client_month_facts
    WHERE deleted_at IS NULL
      AND month = ${month}::date
  `;
  return recommendFromFacts({
    sessions: sessions.map((row) => ({
      trainerStaffMemberId: row.trainer_staff_member_id,
      sessionDate: row.session_date,
      bookingsAtWindowClose: Number(row.bookings_at_window_close),
    })),
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
      await transaction.$executeRaw`
        UPDATE studio.recommendations
        SET detail = ${finding.detail}, updated_at = ${now}
        WHERE id = ${existing.id}::uuid
          AND deleted_at IS NULL
          AND detail IS DISTINCT FROM ${finding.detail}
      `;
    }
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
