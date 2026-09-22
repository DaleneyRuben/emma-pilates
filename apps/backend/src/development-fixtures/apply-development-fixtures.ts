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
};

const upsertAccount = async (
  transaction: Prisma.TransactionClient,
  input: {
    email: string;
    passwordHash: string;
    link: { clientId: string } | { staffMemberId: string };
    now: Date;
  },
): Promise<void> => {
  await transaction.account.upsert({
    where: { email: input.email },
    create: {
      id: deterministicId(`account:${input.email}`),
      email: input.email,
      passwordHash: input.passwordHash,
      emailVerifiedAt: input.now,
      activatedAt: input.now,
      ...input.link,
    },
    update: {
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
          await transaction.staffBranchAssignment.upsert({
            where: {
              staffMemberId_branchId: { staffMemberId: member.id, branchId },
            },
            create: { staffMemberId: member.id, branchId },
            update: {},
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
        await transaction.session.upsert({
          where: { id: session.id },
          create: session,
          update: {},
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

      return {
        accounts: fixtures.staffMembers.length + fixtures.clients.length,
        sessions: fixtures.sessions.length,
        subscriptions: fixtures.subscriptions.length,
        payments: fixtures.payments.length,
        referrals: fixtures.referrals.length,
      };
    },
    { maxWait: 15_000, timeout: 60_000 },
  );
};
