import { randomUUID } from 'node:crypto';
import { PrismaBookingCommands } from '../../src/booking/commands/prisma-booking-commands';
import { createPrismaCourtesyAccess } from '../../src/booking/payments/prisma-courtesy-access';
import {
  hour,
  now,
  type PaymentWorld,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

// REL-011: a closed-test tester uses her 16 courtesy classes like any Plan's,
// on ordinary Sessions (the fictitious schedule has no flag).
describe('Courtesy Access bookings (REL-011)', () => {
  let world: PaymentWorld;

  beforeAll(async () => {
    world = await startPaymentWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  // Each Session gets its own Branch, Trainer, and Class Type so the overlap
  // constraints never meet the development fixtures.
  const newSession = async (startsAt: Date, capacity = 8) => {
    const branch = await world.prisma.branch.create({
      data: { name: randomUUID(), address: 'Calle de prueba' },
    });
    const trainer = await world.prisma.staffMember.create({
      data: { name: 'Instructora de prueba', role: 'TRAINER' },
    });
    const classType = await world.prisma.classType.create({
      data: { name: randomUUID(), description: 'Clase', defaultCapacity: 8 },
    });
    return world.prisma.session.create({
      data: {
        branchId: branch.id,
        classTypeId: classType.id,
        trainerStaffMemberId: trainer.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + hour),
        capacity,
      },
      select: { id: true },
    });
  };

  const newTester = async (name: string) => {
    const tester = await world.newClient(name);
    const admin = await world.staffPrincipal('paola.mendoza@example.com');
    const payment = await createPrismaCourtesyAccess(world.prisma, {
      now: () => now,
    }).grant(
      {
        clientId: tester.clientId,
        endsOn: new Date('2026-11-30T00:00:00.000Z'),
      },
      admin,
      randomUUID(),
    );
    return { ...tester, subscriptionId: payment.subscriptionId! };
  };

  const remaining = async (subscriptionId: string) =>
    (
      await world.prisma.subscription.findUniqueOrThrow({
        where: { id: subscriptionId },
        select: { remainingClassAllowance: true },
      })
    ).remainingClassAllowance;

  it('books, cancels, reschedules, and joins a waitlist with her 16 classes', async () => {
    const commands = new PrismaBookingCommands(world.prisma, () => now);
    const tester = await newTester('Tester Reservas');
    const afternoon = await newSession(new Date(now.getTime() + 4 * hour));
    const evening = await newSession(new Date(now.getTime() + 6 * hour));
    const full = await newSession(new Date(now.getTime() + 5 * hour), 1);
    // Rescheduling is offered inside the Cancellation Window only.
    const soon = await newSession(new Date(now.getTime() + 2 * hour));

    const first = await commands.create({ sessionId: afternoon.id }, tester);
    expect(await remaining(tester.subscriptionId)).toBe(15);

    await commands.cancel({ bookingId: first.id }, tester);
    expect(await remaining(tester.subscriptionId)).toBe(16);

    const again = await commands.create({ sessionId: soon.id }, tester);
    const moved = await commands.reschedule(
      { bookingId: again.id, targetSessionId: evening.id },
      tester,
    );
    expect(await remaining(tester.subscriptionId)).toBe(15);
    await expect(
      world.prisma.booking.findUniqueOrThrow({
        where: { id: moved.id },
        select: { sessionId: true, state: true },
      }),
    ).resolves.toEqual({ sessionId: evening.id, state: 'BOOKED' });

    const other = await newTester('Tester Lleno');
    await commands.create({ sessionId: full.id }, other);
    const entry = await commands.joinWaitlist({ sessionId: full.id }, tester);
    await expect(
      world.prisma.waitlistEntry.findUniqueOrThrow({
        where: { id: entry.id },
        select: { clientId: true, sessionId: true },
      }),
    ).resolves.toEqual({ clientId: tester.clientId, sessionId: full.id });
  });
});
