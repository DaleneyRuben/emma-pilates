import { randomUUID } from 'node:crypto';
import { createPrismaAccountClosure } from '../../src/booking/account-closure/prisma-account-closure';
import { createPrismaAdministratorClients } from '../../src/booking/clients/prisma-administrator-clients';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import {
  closureNow,
  closurePassword,
  ClosureWorld,
  startClosureWorld,
} from './account-closure-test-support';
import { branchIdOf } from './evaluation-test-support';

const hoursFromNow = (hours: number) =>
  new Date(closureNow.getTime() + hours * 60 * 60 * 1_000);

// BE-007 G4–G6 on real PostgreSQL: what closing a Client's Account does to
// Bookings, Evaluations, the Waitlist, the Subscription, and the identity.
describe('closing a Client Account (PostgreSQL)', () => {
  let world: ClosureWorld;
  const closure = () =>
    createPrismaAccountClosure(world.prisma, { now: () => closureNow });
  const bookings = () =>
    new PrismaBookingCommands(world.prisma, () => closureNow);

  beforeAll(async () => {
    world = await startClosureWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('cancels future Bookings without returning a class and promotes the Waitlist into the freed seat', async () => {
    const ana = await world.newClient('Ana Justiniano');
    const bea = await world.newClient('Bea Montaño');
    const sessionId = await world.newSession({ capacity: 1 });
    const booking = await bookings().create({ sessionId }, ana.principal);
    await bookings().joinWaitlist({ sessionId }, bea.principal);
    await world.backdate(ana.clientId);
    await world.backdate(bea.clientId);

    const summary = await closure().close(
      { clientId: ana.clientId, password: closurePassword },
      ana.principal,
    );

    expect(summary).toMatchObject({ cancelledBookings: 1 });
    await expect(
      world.prisma.booking.findUniqueOrThrow({
        where: { id: booking.id },
        select: {
          state: true,
          cancellationCause: true,
          cancelledByAccountId: true,
        },
      }),
    ).resolves.toEqual({
      state: 'CANCELLED',
      cancellationCause: 'ACCOUNT_CLOSED',
      cancelledByAccountId: ana.accountId,
    });
    // No class comes back: the Subscription ends anyway (G5).
    await expect(
      world.prisma.subscription.findUniqueOrThrow({
        where: { id: ana.subscriptionId },
        select: { remainingClassAllowance: true },
      }),
    ).resolves.toEqual({ remainingClassAllowance: 7 });
    await expect(
      world.prisma.booking.findFirst({
        where: { sessionId, clientId: bea.clientId, state: 'BOOKED' },
      }),
    ).resolves.not.toBeNull();
  });

  it('leaves Bookings of Sessions that already started untouched', async () => {
    const ana = await world.newClient('Ana Justiniano');
    const pastSessionId = await world.newSession({
      startsAt: hoursFromNow(-5),
    });
    const past = await world.prisma.booking.create({
      data: {
        sessionId: pastSessionId,
        clientId: ana.clientId,
        subscriptionId: ana.subscriptionId,
        createdByAccountId: ana.accountId,
      },
    });

    await closure().close(
      { clientId: ana.clientId, password: closurePassword },
      ana.principal,
    );

    await expect(
      world.prisma.booking.findUniqueOrThrow({
        where: { id: past.id },
        select: { state: true },
      }),
    ).resolves.toEqual({ state: 'BOOKED' });
  });

  it('closes the Client’s own active Waitlist entries as left by the closer', async () => {
    const ana = await world.newClient('Ana Justiniano');
    const bea = await world.newClient('Bea Montaño');
    const sessionId = await world.newSession({ capacity: 1 });
    await bookings().create({ sessionId }, bea.principal);
    await bookings().joinWaitlist({ sessionId }, ana.principal);
    await world.backdate(ana.clientId);

    const summary = await closure().close(
      { clientId: ana.clientId },
      world.administrator,
    );

    expect(summary).toMatchObject({ closedWaitlistEntries: 1 });
    await expect(
      world.prisma.waitlistEntry.findFirstOrThrow({
        where: { sessionId, clientId: ana.clientId },
        select: {
          closedAt: true,
          closureReason: true,
          closedByAccountId: true,
        },
      }),
    ).resolves.toEqual({
      closedAt: closureNow,
      closureReason: 'LEFT',
      closedByAccountId: world.administrator.accountId,
    });
  });

  it('cancels a future Evaluation as account_closed and frees its slot', async () => {
    const carla = await world.principalOf('carla@example.com');
    const evaluations = createPrismaEvaluationCommands(world.prisma, {
      now: () => closureNow,
    });
    const block = await evaluations.createAvailabilityBlock(
      {
        branchId: branchIdOf('centro'),
        weekday: 3,
        startsAtLocal: '20:15',
        endsAtLocal: '21:00',
        effectiveFrom: new Date('2026-09-21T00:00:00.000Z'),
      },
      carla,
      randomUUID(),
    );
    const slot = await world.prisma.evaluationSlot.findFirstOrThrow({
      where: { availabilityBlockId: block.id, startsAt: { gt: closureNow } },
      orderBy: { startsAt: 'asc' },
      select: { id: true },
    });
    const ana = await world.newClient('Ana Justiniano');
    const evaluation = await evaluations.bookEvaluation(
      slot.id,
      ana.principal,
      randomUUID(),
    );

    const summary = await closure().close(
      { clientId: ana.clientId, password: closurePassword },
      ana.principal,
    );

    expect(summary).toMatchObject({ cancelledEvaluations: 1 });
    await expect(
      world.prisma.evaluation.findUniqueOrThrow({
        where: { id: evaluation.id },
        select: {
          state: true,
          cancellationCause: true,
          cancelledByAccountId: true,
        },
      }),
    ).resolves.toEqual({
      state: 'CANCELLED',
      cancellationCause: 'ACCOUNT_CLOSED',
      cancelledByAccountId: ana.accountId,
    });
    await expect(
      world.prisma.evaluation.count({
        where: { evaluationSlotId: slot.id, state: 'BOOKED' },
      }),
    ).resolves.toBe(0);
  });

  it('ends the Subscription without a refund and keeps the remaining classes as history', async () => {
    const ana = await world.newClient('Ana Justiniano');

    const summary = await closure().close(
      { clientId: ana.clientId, password: closurePassword },
      ana.principal,
    );

    expect(summary).toMatchObject({ forfeitedClasses: 8 });
    await expect(
      world.prisma.subscription.findUniqueOrThrow({
        where: { id: ana.subscriptionId },
        select: {
          state: true,
          expiredAt: true,
          remainingClassAllowance: true,
        },
      }),
    ).resolves.toEqual({
      state: 'EXPIRED',
      expiredAt: closureNow,
      remainingClassAllowance: 8,
    });
  });

  it('closes the identity in the same transaction and writes account.closed', async () => {
    const ana = await world.newClient('Ana Justiniano');
    const sessionRow = await world.prisma.authenticationSession.create({
      data: {
        accountId: ana.accountId,
        credentialDigest: Buffer.from(randomUUID()),
        surface: 'MOBILE',
        createdAt: closureNow,
        lastMeaningfulActivityAt: closureNow,
        idleExpiresAt: hoursFromNow(1),
        absoluteExpiresAt: hoursFromNow(48),
      },
      select: { id: true },
    });
    const link = await world.prisma.authenticationToken.create({
      data: {
        accountId: ana.accountId,
        purpose: 'PASSWORD_RECOVERY',
        issuedAt: closureNow,
        tokenDigest: Buffer.from(randomUUID()),
        expiresAt: hoursFromNow(1),
      },
      select: { id: true },
    });
    const device = await world.prisma.accountDevice.create({
      data: {
        accountId: ana.accountId,
        installationIdDigest: Buffer.from(randomUUID()),
        expoPushToken: 'ExponentPushToken[closure-test]',
        platform: 'IOS',
      },
      select: { id: true },
    });

    await closure().close(
      { clientId: ana.clientId, password: closurePassword },
      ana.principal,
    );

    await expect(
      world.prisma.authenticationSession.findUniqueOrThrow({
        where: { id: sessionRow.id },
        select: { revokedAt: true, revocationReason: true },
      }),
    ).resolves.toEqual({
      revokedAt: closureNow,
      revocationReason: 'ACCOUNT_CLOSED',
    });
    await expect(
      world.prisma.authenticationToken.findUniqueOrThrow({
        where: { id: link.id },
        select: { invalidatedAt: true },
      }),
    ).resolves.toEqual({ invalidatedAt: closureNow });
    await expect(
      world.prisma.accountDevice.findUniqueOrThrow({
        where: { id: device.id },
        select: { deactivatedAt: true, expoPushToken: true },
      }),
    ).resolves.toEqual({ deactivatedAt: closureNow, expoPushToken: null });
    await expect(
      world.prisma.account.findUniqueOrThrow({
        where: { id: ana.accountId },
        select: { deletedAt: true },
      }),
    ).resolves.toEqual({ deletedAt: closureNow });
    await expect(
      world.prisma.client.findUniqueOrThrow({
        where: { id: ana.clientId },
        select: { deletedAt: true },
      }),
    ).resolves.toEqual({ deletedAt: closureNow });
    await expect(
      world.prisma.auditRecord.findFirstOrThrow({
        where: { actionCode: 'account.closed', targetId: ana.accountId },
        select: {
          outcome: true,
          actorKind: true,
          actorAccountId: true,
          actorRole: true,
          targetType: true,
          metadata: true,
        },
      }),
    ).resolves.toEqual({
      outcome: 'SUCCEEDED',
      actorKind: 'ACCOUNT',
      actorAccountId: ana.accountId,
      actorRole: null,
      targetType: 'account',
      metadata: {
        initiatedBy: 'client',
        closedWaitlistEntries: 0,
        cancelledBookings: 0,
        cancelledEvaluations: 0,
        forfeitedClasses: 8,
        forfeitedCreditCentavos: 0,
        keptPromotionContact: false,
        endedPromotionsConsent: false,
      },
    });
  });

  it('frees the email for a new registration', async () => {
    const ana = await world.newClient('Ana Justiniano');
    await closure().close(
      { clientId: ana.clientId, password: closurePassword },
      ana.principal,
    );

    await expect(
      world.prisma.client.create({
        data: {
          name: 'Ana de nuevo',
          referralCode: randomUUID().slice(0, 8),
          account: {
            create: { email: ana.email, pendingExpiresAt: hoursFromNow(1) },
          },
        },
      }),
    ).resolves.toMatchObject({ name: 'Ana de nuevo' });
  });

  it('records the Administrator as actor when the studio closes the Account', async () => {
    const ana = await world.newClient('Ana Justiniano');

    await closure().close({ clientId: ana.clientId }, world.administrator);

    await expect(
      world.prisma.auditRecord.findFirstOrThrow({
        where: { actionCode: 'account.closed', targetId: ana.accountId },
        select: { actorAccountId: true, actorRole: true, metadata: true },
      }),
    ).resolves.toMatchObject({
      actorAccountId: world.administrator.accountId,
      actorRole: 'ADMINISTRATOR',
      metadata: { initiatedBy: 'administrator' },
    });
  });

  it('refuses a wrong password and closes a Client only once', async () => {
    const ana = await world.newClient('Ana Justiniano');

    await expect(
      closure().close(
        { clientId: ana.clientId, password: 'not the password' },
        ana.principal,
      ),
    ).rejects.toMatchObject({ code: 'current_password_incorrect' });
    await expect(
      world.prisma.client.findUniqueOrThrow({
        where: { id: ana.clientId },
        select: { deletedAt: true },
      }),
    ).resolves.toEqual({ deletedAt: null });

    await closure().close(
      { clientId: ana.clientId, password: closurePassword },
      ana.principal,
    );
    await expect(
      closure().close({ clientId: ana.clientId }, world.administrator),
    ).rejects.toMatchObject({ code: 'client_not_found' });
  });

  it('previews for AW22 exactly what closure then cancels', async () => {
    const ana = await world.newClient('Ana Justiniano');
    const bea = await world.newClient('Bea Montaño');
    const full = await world.newSession({ capacity: 1 });
    const open = await world.newSession({});
    await bookings().create({ sessionId: full }, bea.principal);
    await bookings().joinWaitlist({ sessionId: full }, ana.principal);
    await bookings().create({ sessionId: open }, ana.principal);
    await world.backdate(ana.clientId);
    await world.backdate(bea.clientId);

    const outlook = await createPrismaAdministratorClients(
      world.prisma,
    ).readClosureOutlook(ana.clientId, closureNow);
    const summary = await closure().close(
      { clientId: ana.clientId },
      world.administrator,
    );

    expect(outlook).toEqual({
      futureBookingCount: summary.cancelledBookings,
      activeWaitlistEntryCount: summary.closedWaitlistEntries,
      upcomingEvaluationCount: summary.cancelledEvaluations,
      transferPaymentPending: false,
    });
    expect(outlook).toMatchObject({
      futureBookingCount: 1,
      activeWaitlistEntryCount: 1,
    });
  });
});
