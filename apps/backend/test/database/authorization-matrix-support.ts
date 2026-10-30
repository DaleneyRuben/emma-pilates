import { hash } from 'argon2';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';

const day = 24 * 60 * 60 * 1_000;

/** Rows the spec creates so a Booking command reaches its access check. */
export type RealIds = {
  sessionId: string;
  otherSessionId: string;
  bookingId: string;
  /** A second Booking, so rescheduling never meets the cancelled one. */
  rescheduleBookingId: string;
  waitlistEntryId: string;
  clientId: string;
  /** A real Freeze, so the decision probe reaches the Role check. */
  freezeId: string;
  /** A real Evaluation slot, so the payment probe reaches the Role check. */
  slotId: string;
  /** A real Trainer, whose Branches the Coordinator may change (decision 6). */
  trainerStaffMemberId: string;
};

// The fixtures are dated September 2026 and the API runs on the real clock,
// so the Booking rows of the matrix get two future Sessions of their own, a
// Booking, and a Waitlist Entry for Bea, whose test Plan is still active.
export const findRealIds = async (prisma: PrismaClient): Promise<RealIds> => {
  const bea = deterministicId('test-client:bea');
  const subscription = await prisma.subscription.findFirstOrThrow({
    where: { clientId: bea },
    select: { id: true },
  });
  const camila = await prisma.account.findFirstOrThrow({
    where: { email: 'camila.rojas@example.com' },
    select: { id: true },
  });
  const sessionAt = async (offsetDays: number) => {
    const startsAt = new Date(Date.now() + offsetDays * day);
    return prisma.session.create({
      data: {
        branchId: deterministicId('branch:urubo'),
        classTypeId: deterministicId('class-type:mat'),
        trainerStaffMemberId: deterministicId('staff-member:daniela'),
        startsAt,
        endsAt: new Date(startsAt.getTime() + 50 * 60_000),
        capacity: 8,
        isException: true,
      },
      select: { id: true },
    });
  };
  const [session, other, waitlisted] = await Promise.all([
    sessionAt(2),
    sessionAt(3),
    sessionAt(4),
  ]);
  // A Booking holds one class of the Plan, so cancelling it can return it.
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { remainingClassAllowance: { decrement: 2 } },
  });
  // Password-checking rows need a real hash to compare against.
  await prisma.account.updateMany({
    where: {
      email: {
        in: ['paola.mendoza@example.com', 'carolina.rivas@example.com'],
      },
    },
    data: { passwordHash: await hash('matrix password') },
  });
  const bookOn = (sessionId: string) =>
    prisma.booking.create({
      data: {
        sessionId,
        clientId: bea,
        subscriptionId: subscription.id,
        createdByAccountId: camila.id,
      },
      select: { id: true },
    });
  const booking = await bookOn(session.id);
  const rescheduled = await bookOn(waitlisted.id);
  const freeze = await prisma.freeze.create({
    data: {
      subscriptionId: subscription.id,
      clientId: bea,
      startsOn: new Date('2026-11-01T00:00:00.000Z'),
      endsOn: new Date('2026-11-10T00:00:00.000Z'),
      reason: 'Viaje',
    },
    select: { id: true },
  });
  const slot = await prisma.evaluationSlot.findFirstOrThrow({
    where: { state: 'PUBLISHED' },
    orderBy: { startsAt: 'desc' },
    select: { id: true },
  });
  const entry = await prisma.waitlistEntry.create({
    data: {
      sessionId: waitlisted.id,
      clientId: bea,
      joinedByAccountId: camila.id,
    },
    select: { id: true },
  });
  return {
    sessionId: session.id,
    otherSessionId: other.id,
    bookingId: booking.id,
    rescheduleBookingId: rescheduled.id,
    waitlistEntryId: entry.id,
    clientId: bea,
    freezeId: freeze.id,
    slotId: slot.id,
    trainerStaffMemberId: deterministicId('staff-member:daniela'),
  };
};
