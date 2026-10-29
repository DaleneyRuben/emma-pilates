import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import {
  fixtures,
  PaymentWorld,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

const quarterly = fixtures.plans.find(
  (item) => item.name === 'Trimestral 36 clases',
)!;

const clientPrincipal = (client: { accountId: string; clientId: string }) => ({
  accountId: client.accountId,
  authenticationSessionId: randomUUID(),
  identity: { kind: 'client' as const, clientId: client.clientId },
});

describe('freeze enforcement on waitlist and reschedule', () => {
  let world: PaymentWorld;
  let prisma: PrismaClient;

  beforeAll(async () => {
    world = await startPaymentWorld();
    ({ prisma } = world);
  });

  afterAll(async () => {
    await world?.stop();
  });

  const cash = async (clientId: string) => {
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    const centro = fixtures.branches.find(
      (branch) => branch.name === 'Centro',
    )!;
    return world
      .commands()
      .recordCashPayment(
        { clientId, planId: quarterly.id, branchId: centro.id },
        assistant,
        randomUUID(),
      );
  };

  it('closes a Waitlist entry inside the Freeze and refuses a later join', async () => {
    const client = await world.newClient('Espera congelada');
    const sale = await cash(client.clientId);
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
    const session = await prisma.session.findFirstOrThrow({
      where: {
        startsAt: {
          gte: new Date('2026-09-25T20:00:00.000Z'),
          lt: new Date('2026-09-26T00:00:00.000Z'),
        },
        state: 'SCHEDULED',
      },
    });
    await prisma.session.update({
      where: { id: session.id },
      data: { capacity: 1 },
    });
    const holder = await world.newClient('Ocupa el lugar');
    await cash(holder.clientId);
    const bookings = new PrismaBookingCommands(
      prisma,
      () => new Date('2026-09-21T15:00:00.000Z'),
    );
    await bookings.create({ sessionId: session.id }, clientPrincipal(holder));
    await bookings.joinWaitlist(
      { sessionId: session.id },
      clientPrincipal(client),
    );

    const commands = createPrismaPaymentCommands(prisma, {
      now: () => new Date('2026-09-22T15:00:00.000Z'),
    });
    const requested = await commands.requestFreeze(
      {
        subscriptionId: subscription.id,
        startsOn: '2026-09-25',
        endsOn: '2026-09-30',
        reason: 'Viaje',
      },
      clientPrincipal(client),
    );
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );
    await commands.decideFreeze(
      { freezeId: requested.id, decision: 'approved' },
      administrator,
    );

    await expect(
      prisma.waitlistEntry.findFirstOrThrow({
        where: { sessionId: session.id, clientId: client.clientId },
      }),
    ).resolves.toMatchObject({
      closedAt: expect.any(Date) as Date,
      closureReason: 'SESSION_CANCELLED',
    });
    await expect(
      bookings.joinWaitlist({ sessionId: session.id }, clientPrincipal(client)),
    ).rejects.toThrow(/Booking is during a Freeze until 2026-09-30/);
  });

  it('refuses a Reschedule into the Freeze and before the Start Date', async () => {
    const client = await world.newClient('Reprograma');
    const sale = await cash(client.clientId);
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
    const outside = await prisma.session.findFirstOrThrow({
      where: {
        startsAt: {
          gte: new Date('2026-09-22T22:00:00.000Z'),
          lt: new Date('2026-09-22T23:00:00.000Z'),
        },
        state: 'SCHEDULED',
      },
    });
    const inside = await prisma.session.findFirstOrThrow({
      where: {
        startsAt: {
          gte: new Date('2026-09-25T22:00:00.000Z'),
          lt: new Date('2026-09-25T23:00:00.000Z'),
        },
        state: 'SCHEDULED',
      },
    });
    const bookings = new PrismaBookingCommands(
      prisma,
      () => new Date('2026-09-22T21:00:00.000Z'),
    );
    const booking = await bookings.create(
      { sessionId: outside.id },
      clientPrincipal(client),
    );
    const commands = createPrismaPaymentCommands(prisma, {
      now: () => new Date('2026-09-22T12:00:00.000Z'),
    });
    const requested = await commands.requestFreeze(
      {
        subscriptionId: subscription.id,
        startsOn: '2026-09-25',
        endsOn: '2026-09-30',
        reason: 'Viaje',
      },
      clientPrincipal(client),
    );
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );
    await commands.decideFreeze(
      { freezeId: requested.id, decision: 'approved' },
      administrator,
    );

    await expect(
      bookings.reschedule(
        { bookingId: booking.id, targetSessionId: inside.id },
        clientPrincipal(client),
      ),
    ).rejects.toThrow(/Booking is during a Freeze/);

    const early = await prisma.session.findFirstOrThrow({
      where: {
        startsAt: {
          gte: new Date('2026-09-23T22:00:00.000Z'),
          lt: new Date('2026-09-23T23:00:00.000Z'),
        },
        state: 'SCHEDULED',
      },
    });
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { startsOn: new Date('2026-09-24T00:00:00.000Z') },
    });
    await expect(
      bookings.reschedule(
        { bookingId: booking.id, targetSessionId: early.id },
        clientPrincipal(client),
      ),
    ).rejects.toThrow(/Booking is before the Start Date/);
  });

  it('cancels a late La Paz session on the last freeze day and keeps the evening before', async () => {
    const client = await world.newClient('Noche de La Paz');
    const sale = await cash(client.clientId);
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
    const sample = await prisma.session.findFirstOrThrow({
      where: { state: 'SCHEDULED' },
    });
    const lastNight = await prisma.session.create({
      data: {
        branchId: sample.branchId,
        classTypeId: sample.classTypeId,
        trainerStaffMemberId: sample.trainerStaffMemberId,
        startsAt: new Date('2026-10-01T00:00:00.000Z'),
        endsAt: new Date('2026-10-01T03:59:00.000Z'),
        capacity: 8,
        state: 'SCHEDULED',
      },
    });
    const eveningBefore = await prisma.session.create({
      data: {
        branchId: sample.branchId,
        classTypeId: sample.classTypeId,
        trainerStaffMemberId: sample.trainerStaffMemberId,
        startsAt: new Date('2026-09-22T00:00:00.000Z'),
        endsAt: new Date('2026-09-22T03:59:00.000Z'),
        capacity: 8,
        state: 'SCHEDULED',
      },
    });
    const bookings = new PrismaBookingCommands(
      prisma,
      () => new Date('2026-09-21T15:00:00.000Z'),
    );
    const lastBooking = await bookings.create(
      { sessionId: lastNight.id },
      clientPrincipal(client),
    );
    const earlierBooking = await bookings.create(
      { sessionId: eveningBefore.id },
      clientPrincipal(client),
    );
    const commands = createPrismaPaymentCommands(prisma, {
      now: () => new Date('2026-09-21T16:00:00.000Z'),
    });
    const requested = await commands.requestFreeze(
      {
        subscriptionId: subscription.id,
        startsOn: '2026-09-22',
        endsOn: '2026-09-30',
        reason: 'Viaje',
      },
      clientPrincipal(client),
    );
    await commands.decideFreeze(
      { freezeId: requested.id, decision: 'approved' },
      await world.staffPrincipal('paola.mendoza@example.com'),
    );

    await expect(
      prisma.booking.findUniqueOrThrow({ where: { id: lastBooking.id } }),
    ).resolves.toMatchObject({ state: 'CANCELLED' });
    await expect(
      prisma.booking.findUniqueOrThrow({ where: { id: earlierBooking.id } }),
    ).resolves.toMatchObject({ state: 'BOOKED' });
  });
});
