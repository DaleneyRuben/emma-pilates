import type { Prisma, PrismaClient } from '../generated/prisma/client';
import {
  CreditLedgerActorKind,
  CreditLedgerEntryKind,
  PaymentMethod,
  PaymentState,
  ReferralState,
  StaffRole,
  SubscriptionState,
} from '../generated/prisma/enums';
import { plannedSlots } from '../booking/evaluations/evaluation-rules';
import { boliviaDate } from '../time/bolivia-time';
import { deterministicId } from './deterministic-id';
import type {
  DevelopmentFixtures,
  FixtureStaffRole,
} from './development-fixtures';

const staffRoles: Record<FixtureStaffRole, StaffRole> = {
  trainer: StaffRole.TRAINER,
  assistant: StaffRole.ASSISTANT,
  administrator: StaffRole.ADMINISTRATOR,
  nutritionist: StaffRole.NUTRITIONIST,
  coordinator: StaffRole.COORDINATOR,
};

const subscriptionStates = {
  active: SubscriptionState.ACTIVE,
  expired: SubscriptionState.EXPIRED,
} as const;

export type DevelopmentFixtureSummary = {
  accounts: number;
  sessions: number;
  subscriptions: number;
  payments: number;
  referrals: number;
  availabilityBlocks: number;
};

const minutesOf = (clock: string): number => {
  const [hours, minutes] = clock.split(':').map(Number);
  return hours * 60 + minutes;
};

const timeValue = (clock: string): Date =>
  new Date(Date.UTC(1970, 0, 1, 0, minutesOf(clock)));

const upsertAccount = async (
  transaction: Prisma.TransactionClient,
  input: {
    email: string;
    passwordHash: string;
    link: { clientId: string } | { staffMemberId: string };
    now: Date;
  },
): Promise<void> => {
  const existing = await transaction.account.findFirst({
    where: { email: input.email, deletedAt: null },
    select: { id: true },
  });
  if (existing === null) {
    await transaction.account.create({
      data: {
        id: deterministicId(`account:${input.email}`),
        email: input.email,
        passwordHash: input.passwordHash,
        emailVerifiedAt: input.now,
        activatedAt: input.now,
        ...input.link,
      },
    });
    return;
  }
  await transaction.account.update({
    where: { id: existing.id },
    data: {
      passwordHash: input.passwordHash,
      disabledAt: null,
      pendingExpiresAt: null,
      ...input.link,
    },
  });
};

export const applyDevelopmentFixtures = async (
  prisma: PrismaClient,
  input: {
    fixtures: DevelopmentFixtures;
    passwordHash: string;
    now?: () => Date;
  },
): Promise<DevelopmentFixtureSummary> => {
  const { fixtures } = input;
  const now = (input.now ?? (() => new Date()))();

  return prisma.$transaction(
    async (transaction) => {
      for (const branch of fixtures.branches) {
        const { id, ...data } = branch;
        await transaction.branch.upsert({
          where: { id },
          create: branch,
          update: data,
        });
      }

      for (const classType of fixtures.classTypes) {
        const { id, ...data } = classType;
        await transaction.classType.upsert({
          where: { id },
          create: classType,
          update: data,
        });
      }

      for (const plan of fixtures.plans) {
        const { id, ...data } = plan;
        await transaction.plan.upsert({
          where: { id },
          create: plan,
          update: data,
        });
      }

      for (const member of fixtures.staffMembers) {
        const data = { name: member.name, role: staffRoles[member.role] };
        await transaction.staffMember.upsert({
          where: { id: member.id },
          create: { id: member.id, ...data },
          update: data,
        });

        for (const branchId of member.branchIds) {
          // Skips a Branch the Staff Member already holds a live assignment to.
          await transaction.staffBranchAssignment.createMany({
            data: [{ staffMemberId: member.id, branchId }],
            skipDuplicates: true,
          });
        }

        await upsertAccount(transaction, {
          email: member.email,
          passwordHash: input.passwordHash,
          link: { staffMemberId: member.id },
          now,
        });
      }

      for (const client of fixtures.clients) {
        const data = {
          name: client.name,
          phone: client.phone,
          referralCode: client.referralCode,
        };
        await transaction.client.upsert({
          where: { id: client.id },
          create: { id: client.id, ...data },
          update: data,
        });

        await upsertAccount(transaction, {
          email: client.email,
          passwordHash: input.passwordHash,
          link: { clientId: client.id },
          now,
        });
      }

      for (const schedule of fixtures.sessionSchedules) {
        const { id, ...data } = schedule;
        await transaction.sessionSchedule.upsert({
          where: { id },
          create: schedule,
          update: data,
        });
      }

      for (const session of fixtures.sessions) {
        // The worker's reconciler may already hold this schedule and start
        // under its own id; that occurrence is the same Session, so keep it.
        const occupant = await transaction.session.findUnique({
          where: {
            sessionScheduleId_occurrenceStartsAt: {
              sessionScheduleId: session.sessionScheduleId,
              occurrenceStartsAt: session.startsAt,
            },
          },
          select: { id: true },
        });
        if (occupant !== null && occupant.id !== session.id) continue;
        // Scheduled times follow the schedule; state, capacity, and
        // cancellations belong to the running system and are kept.
        await transaction.session.upsert({
          where: { id: session.id },
          create: { ...session, occurrenceStartsAt: session.startsAt },
          update: {
            startsAt: session.startsAt,
            endsAt: session.endsAt,
            occurrenceStartsAt: session.startsAt,
          },
        });
      }

      // Payments, referrals, and ledger entries are immutable once written,
      // so they are only created when missing instead of upserted.
      for (const payment of fixtures.payments) {
        const existing = await transaction.payment.findUnique({
          where: { id: payment.id },
          select: { id: true },
        });
        if (existing) continue;
        await transaction.payment.create({
          data: {
            ...payment,
            method: PaymentMethod.CASH,
            state: PaymentState.CONFIRMED,
          },
        });
      }

      for (const subscription of fixtures.subscriptions) {
        const { id, state, ...data } = subscription;
        const row = { ...data, state: subscriptionStates[state] };
        await transaction.subscription.upsert({
          where: { id },
          create: { id, ...row },
          update: row,
        });
      }

      for (const referral of fixtures.referrals) {
        const existing = await transaction.referral.findUnique({
          where: { id: referral.id },
          select: { id: true },
        });
        if (existing) continue;
        await transaction.referral.create({
          data: {
            ...referral,
            state:
              referral.state === 'awarded'
                ? ReferralState.AWARDED
                : ReferralState.PENDING,
          },
        });
      }

      for (const entry of fixtures.creditLedgerEntries) {
        const existing = await transaction.creditLedgerEntry.findUnique({
          where: { id: entry.id },
          select: { id: true },
        });
        if (existing) continue;
        await transaction.creditLedgerEntry.create({
          data: {
            ...entry,
            kind: CreditLedgerEntryKind.REFERRAL_AWARD,
            actorKind: CreditLedgerActorKind.ACCOUNT,
          },
        });
      }

      // Blocks are immutable once published, so a re-application keeps the
      // original effective date and only fills the slot horizon.
      for (const block of fixtures.availabilityBlocks) {
        const existing = await transaction.availabilityBlock.findUnique({
          where: { id: block.id },
          select: { effectiveFrom: true, effectiveUntil: true },
        });
        if (!existing) {
          await transaction.availabilityBlock.create({
            data: {
              id: block.id,
              nutritionistStaffMemberId: block.nutritionistStaffMemberId,
              branchId: block.branchId,
              weekday: block.weekday,
              startsAtLocal: timeValue(block.startsAtLocal),
              endsAtLocal: timeValue(block.endsAtLocal),
              effectiveFrom: block.effectiveFrom,
              createdByAccountId: block.createdByAccountId,
              createdAt: now,
            },
          });
        }
        const slots = plannedSlots(
          {
            weekday: block.weekday,
            startMinutes: minutesOf(block.startsAtLocal),
            endMinutes: minutesOf(block.endsAtLocal),
            effectiveFrom: existing?.effectiveFrom ?? block.effectiveFrom,
            effectiveUntil: existing?.effectiveUntil ?? null,
          },
          { today: boliviaDate(now), now },
        );
        await transaction.evaluationSlot.createMany({
          data: slots.map((slot) => ({
            availabilityBlockId: block.id,
            nutritionistStaffMemberId: block.nutritionistStaffMemberId,
            branchId: block.branchId,
            ...slot,
            createdAt: now,
          })),
          skipDuplicates: true,
        });
      }

      return {
        accounts: fixtures.staffMembers.length + fixtures.clients.length,
        sessions: fixtures.sessions.length,
        subscriptions: fixtures.subscriptions.length,
        payments: fixtures.payments.length,
        referrals: fixtures.referrals.length,
        availabilityBlocks: fixtures.availabilityBlocks.length,
      };
    },
    { maxWait: 15_000, timeout: 60_000 },
  );
};
