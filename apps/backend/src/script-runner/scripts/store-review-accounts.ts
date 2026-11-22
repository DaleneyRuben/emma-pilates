import { randomBytes, randomUUID } from 'node:crypto';
import { claimReadableReferralCode } from '../../booking/acquisition/referral-code-claim';
import {
  SessionState,
  StaffRole,
  type PrismaClient,
} from '../../generated/prisma/client';
import {
  courtesyAccessPlan,
  legacyCourtesyPlanName,
} from '../../booking/payments/courtesy-access';
import { PaymentRuleError } from '../../booking/payments/payment-errors';
import { createPrismaCourtesyAccess } from '../../booking/payments/prisma-courtesy-access';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { hashPassword } from '../../system-identity/security/argon2-password-hasher';
import { addCivilDays, boliviaDate } from '../../time/bolivia-time';
import type { ScriptContext, ScriptDefinition } from '../run-script';

// REL-016: the Accounts Apple's and Google's reviewers sign in with. A Client
// with the hidden tester Plan (REL-011), so the reviewer can book, and a
// Trainer with no Branch and no classes, both marked store_review. A rerun
// gives both fresh passwords; it only ever touches Accounts it marked, so a
// real person's Account is never taken over. With no class ahead to book,
// a reviewer cannot test the app (App Review 2.1), so the run refuses.
const reviewerName = 'Revisión tienda';
const defaultTermDays = 90;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const civilPattern = /^\d{4}-\d{2}-\d{2}$/;

type Kind = 'client' | 'trainer';

const emailParam = (value: unknown): string => {
  if (typeof value !== 'string' || !emailPattern.test(value.trim())) {
    throw new Error('email_invalid');
  }
  return value.trim().toLowerCase();
};

const endsOnParam = (value: unknown, now: Date): Date => {
  if (value === undefined) {
    return addCivilDays(boliviaDate(now), defaultTermDays);
  }
  if (typeof value !== 'string' || !civilPattern.test(value)) {
    throw new Error('ends_on_invalid');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error('ends_on_invalid');
  return date;
};

// Whether the email is free, a reviewer Account of this kind, or taken.
const existingReviewer = async (
  prisma: PrismaClient,
  email: string,
  kind: Kind,
): Promise<{ id: string } | null> => {
  const account = await prisma.account.findFirst({
    where: { email, deletedAt: null },
    select: {
      id: true,
      storeReview: true,
      clientId: true,
      staffMember: { select: { role: true } },
    },
  });
  if (account === null) return null;
  const sameKind =
    kind === 'client'
      ? account.clientId !== null
      : account.staffMember?.role === StaffRole.TRAINER;
  if (!account.storeReview || !sameKind) throw new Error('email_taken');
  return { id: account.id };
};

const administratorPrincipal = async (
  prisma: PrismaClient,
): Promise<AuthenticatedPrincipal> => {
  const account = await prisma.account.findFirst({
    where: {
      deletedAt: null,
      disabledAt: null,
      activatedAt: { not: null },
      staffMember: { is: { role: StaffRole.ADMINISTRATOR, deletedAt: null } },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      staffMember: {
        select: { id: true, branchAssignments: { select: { branchId: true } } },
      },
    },
  });
  if (account?.staffMember == null) throw new Error('administrator_missing');
  return {
    accountId: account.id,
    authenticationSessionId: randomUUID(),
    identity: {
      kind: 'staff',
      staffMemberId: account.staffMember.id,
      role: 'administrator',
      branchIds: account.staffMember.branchAssignments.map((a) => a.branchId),
    },
  };
};

const prepareAccount = async (
  context: ScriptContext,
  input: { email: string; kind: Kind; existing: { id: string } | null },
): Promise<void> => {
  const { prisma } = context;
  const now = context.now();
  const password = randomBytes(18).toString('base64url');
  const passwordHash = await hashPassword(password);
  if (input.existing !== null) {
    // A rerun also renames Accounts made under the old Play reviewer name.
    const rename = { update: { name: reviewerName } };
    await prisma.account.update({
      where: { id: input.existing.id },
      data: {
        passwordHash,
        passwordChangedAt: now,
        disabledAt: null,
        pendingExpiresAt: null,
        ...(input.kind === 'client'
          ? { client: rename }
          : { staffMember: rename }),
      },
    });
  } else {
    await prisma.$transaction(async (transaction) => {
      const link =
        input.kind === 'client'
          ? {
              clientId: (
                await transaction.client.create({
                  data: {
                    name: reviewerName,
                    referralCode: await claimReadableReferralCode(
                      transaction,
                      reviewerName,
                    ),
                  },
                  select: { id: true },
                })
              ).id,
            }
          : {
              staffMemberId: (
                await transaction.staffMember.create({
                  data: {
                    name: reviewerName,
                    role: StaffRole.TRAINER,
                    referralCode: await claimReadableReferralCode(
                      transaction,
                      reviewerName,
                    ),
                  },
                  select: { id: true },
                })
              ).id,
            };
      await transaction.account.create({
        data: {
          email: input.email,
          passwordHash,
          emailVerifiedAt: now,
          activatedAt: now,
          storeReview: true,
          ...link,
        },
      });
    });
  }
  // The job's log is the one place the password appears: the owner copies
  // it into the store's review form.
  context.log('store_review_account_ready', {
    email: input.email,
    kind: input.kind,
    password,
  });
};

// A grant made before 2026-11-22 keeps «Acceso de prueba» on the reviewer's
// Inicio and Mi plan until it ends, and App Review reads «prueba» as a
// trial. Only this marked Account's Subscription changes, never a Client's;
// its Payment keeps the snapshot, which the database never lets change.
const renameLegacyCourtesy = async (
  context: ScriptContext,
  email: string,
): Promise<void> => {
  const { prisma } = context;
  const { clientId } = await prisma.account.findFirstOrThrow({
    where: { email, deletedAt: null },
    select: { clientId: true },
  });
  const legacy = {
    clientId: clientId!,
    planNameSnapshot: legacyCourtesyPlanName,
  };
  const data = { planNameSnapshot: courtesyAccessPlan.name };
  const [subscriptions] = await prisma.$transaction([
    prisma.subscription.updateMany({ where: legacy, data }),
    prisma.plan.updateMany({
      where: {
        name: legacyCourtesyPlanName,
        priceCentavos: 0,
        hiddenAt: { not: null },
      },
      data: { name: courtesyAccessPlan.name },
    }),
  ]);
  context.log('store_review_plan_renamed', {
    email,
    subscriptions: subscriptions.count,
  });
};

const grantTesterPlan = async (
  context: ScriptContext,
  email: string,
  endsOn: Date,
): Promise<void> => {
  const account = await context.prisma.account.findFirstOrThrow({
    where: { email, deletedAt: null },
    select: { clientId: true },
  });
  try {
    await createPrismaCourtesyAccess(context.prisma, {
      now: context.now,
    }).grant(
      { clientId: account.clientId!, endsOn },
      await administratorPrincipal(context.prisma),
      randomUUID(),
    );
    context.log('store_review_plan_granted', {
      email,
      endsOn: endsOn.toISOString().slice(0, 10),
    });
  } catch (error) {
    if (
      !(error instanceof PaymentRuleError) ||
      error.code !== 'subscription_not_expired'
    ) {
      throw error;
    }
    context.log('store_review_plan_already_active', { email });
  }
};

export const storeReviewAccounts: ScriptDefinition = {
  requiredParams: ['clientEmail', 'trainerEmail'],
  run: async (context) => {
    const clientEmail = emailParam(context.params.clientEmail);
    const trainerEmail = emailParam(context.params.trainerEmail);
    if (clientEmail === trainerEmail) throw new Error('emails_equal');
    const endsOn = endsOnParam(context.params.endsOn, context.now());
    const client = await existingReviewer(
      context.prisma,
      clientEmail,
      'client',
    );
    const trainer = await existingReviewer(
      context.prisma,
      trainerEmail,
      'trainer',
    );
    await administratorPrincipal(context.prisma);
    const upcomingSessions = await context.prisma.session.count({
      where: { state: SessionState.SCHEDULED, startsAt: { gt: context.now() } },
    });
    context.log('store_review_schedule', { upcomingSessions });
    if (upcomingSessions === 0) throw new Error('no_upcoming_sessions');

    if (context.dryRun) {
      context.log('store_review_dry_run', {
        client: client === null ? 'create' : 'renew',
        trainer: trainer === null ? 'create' : 'renew',
        endsOn: endsOn.toISOString().slice(0, 10),
      });
      return;
    }
    await prepareAccount(context, {
      email: clientEmail,
      kind: 'client',
      existing: client,
    });
    await prepareAccount(context, {
      email: trainerEmail,
      kind: 'trainer',
      existing: trainer,
    });
    await renameLegacyCourtesy(context, clientEmail);
    await grantTesterPlan(context, clientEmail, endsOn);
  },
};
