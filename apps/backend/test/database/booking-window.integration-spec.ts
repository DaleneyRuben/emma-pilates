import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { readCurrentStudioSettings } from '../../src/booking/studio-settings/prisma-studio-settings';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import { addCivilDays, boliviaDate } from '../../src/time/bolivia-time';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

// FIX-026: the Booking Window is read from the Studio Settings in force, in
// the same transaction as the booking, for the Client and for the Assistant.
const now = new Date();
const today = boliviaDate(now);

describe('the Booking Window', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const fixtures = buildDevelopmentFixtures({ today });

  const account = (email: string) =>
    prisma.account.findFirstOrThrow({
      where: { email, deletedAt: null },
      select: {
        id: true,
        clientId: true,
        staffMember: {
          select: {
            id: true,
            branchAssignments: { select: { branchId: true } },
          },
        },
      },
    });

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: 'not-a-real-hash',
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('refuses a Session on the seventh day for the Client and the Assistant, until the window grows', async () => {
    const commands = new PrismaBookingCommands(prisma, () => new Date());
    const lucia = await account('lucia@example.com');
    const camila = await account('camila.rojas@example.com');
    const client: AuthenticatedPrincipal = {
      accountId: lucia.id,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client', clientId: lucia.clientId! },
    };
    const assistant: AuthenticatedPrincipal = {
      accountId: camila.id,
      authenticationSessionId: randomUUID(),
      identity: {
        kind: 'staff',
        staffMemberId: camila.staffMember!.id,
        role: 'assistant',
        branchIds: camila.staffMember!.branchAssignments.map((a) => a.branchId),
      },
    };
    const seventhDay = addCivilDays(today, 7).getTime();
    const far = fixtures.sessions.find(
      (session) =>
        boliviaDate(session.startsAt).getTime() === seventhDay &&
        assistant.identity.kind === 'staff' &&
        assistant.identity.branchIds.includes(session.branchId),
    )!;
    const refusal = 'Session is beyond the Booking Window';

    await expect(
      commands.create({ sessionId: far.id }, client),
    ).rejects.toThrow(refusal);
    await expect(
      commands.create(
        { sessionId: far.id, clientId: lucia.clientId! },
        assistant,
      ),
    ).rejects.toThrow(refusal);
    await expect(
      commands.joinWaitlist({ sessionId: far.id }, client),
    ).rejects.toThrow(refusal);

    const author = await account('paola.mendoza@example.com');
    const current = await readCurrentStudioSettings(prisma);
    await prisma.studioSettingsVersion.create({
      data: {
        ...current,
        version: current.version + 1,
        bookingWindowDays: 14,
        openingDate:
          current.openingDate === null
            ? null
            : new Date(`${current.openingDate}T00:00:00.000Z`),
        createdByAccountId: author.id,
      },
    });

    const booked = commands.create({ sessionId: far.id }, client).then(
      () => 'booked',
      (error: Error) => error.message,
    );
    await expect(booked).resolves.not.toBe(refusal);
  });
});
