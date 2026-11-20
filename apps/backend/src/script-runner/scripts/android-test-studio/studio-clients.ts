import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../../generated/prisma/client';
import { PaymentRuleError } from '../../../booking/payments/payment-errors';
import { inviteClient } from '../../../system-identity/invitations/client-invitations';
import type { StudioClient } from './params';
import { administratorEmail } from './studio-people';
import { actingAdministrator } from './studio-principals';
import type { StudioRun } from './studio-services';

const clientAccount = (prisma: PrismaClient, email: string) =>
  prisma.account.findFirst({
    where: { email, deletedAt: null },
    select: { clientId: true },
  });

// Refuses, before anything is written, a tester address that belongs to a
// Staff Member: the script never turns someone's Account into another kind.
export const checkClientEmails = async (
  prisma: PrismaClient,
  clients: StudioClient[],
): Promise<void> => {
  for (const client of clients) {
    const account = await clientAccount(prisma, client.email);
    if (account !== null && account.clientId === null) {
      throw new Error('client_email_taken');
    }
  }
};

// «Crear clienta nueva» in the Staff app: a pending Client and her 7-day
// Activation Link email. A Client who already exists is left as she is, so
// a rerun sends her nothing.
export const inviteClients = async (
  run: StudioRun,
  clients: StudioClient[],
): Promise<void> => {
  const { prisma, dryRun, log } = run.context;
  for (const client of clients) {
    const existing = await clientAccount(prisma, client.email);
    log('android_test_client', {
      email: client.email,
      action: existing === null ? 'invite' : 'exists',
    });
    if (existing !== null) continue;
    run.queueEmail();
    if (dryRun) continue;
    await inviteClient(
      { name: client.name, email: client.email, phone: client.phone },
      await actingAdministrator(prisma, administratorEmail),
      run.services.clientInvitations,
    );
  }
};

// REL-011's Courtesy Access: the hidden Bs 0 Plan of 16 classes an
// Administrator grants a closed-test tester so she can book without paying.
// No product path gives a catalog Plan without a payment, so this is the gift.
export const grantCourtesyAccess = async (
  run: StudioRun,
  clients: StudioClient[],
  endsOn: Date | null,
): Promise<void> => {
  const { prisma, dryRun, log } = run.context;
  if (endsOn === null) return;
  const endsOnText = endsOn.toISOString().slice(0, 10);
  for (const client of clients) {
    if (dryRun) {
      log('android_test_courtesy_access', {
        email: client.email,
        endsOn: endsOnText,
        action: 'grant',
      });
      continue;
    }
    const account = await clientAccount(prisma, client.email);
    try {
      await run.services.courtesyAccess.grant(
        { clientId: account!.clientId!, endsOn },
        await actingAdministrator(prisma, administratorEmail),
        randomUUID(),
      );
      log('android_test_courtesy_access', {
        email: client.email,
        endsOn: endsOnText,
        action: 'granted',
      });
    } catch (error) {
      if (
        !(error instanceof PaymentRuleError) ||
        error.code !== 'subscription_not_expired'
      ) {
        throw error;
      }
      log('android_test_courtesy_access', {
        email: client.email,
        action: 'already_active',
      });
    }
  }
};
