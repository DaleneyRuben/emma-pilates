import { Prisma } from '../../src/generated/prisma/client';
import { recordNotification } from '../../src/notifications/prisma-notification-store';
import {
  hour,
  slotStart,
  startSessionStartChecksWorld,
  type SessionStartChecksWorld,
} from './session-start-checks-test-support';

const lead = 3 * hour;

// A Session whose settlement fails, whatever the error, leaves the others
// settled and is reported; the next sweep finishes it.
describe('Prisma Session start checks: a failure in the sweep', () => {
  let world: SessionStartChecksWorld;

  beforeAll(async () => {
    world = await startSessionStartChecksWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  const sessionRow = (id: string) =>
    world.prisma.session.findUniqueOrThrow({ where: { id } });

  it('finishes the remaining Sessions after a restart in the middle of a check, without repeating the settled one', async () => {
    const firstStart = slotStart(2);
    const first = await world.createSession(firstStart);
    const second = await world.createSession(
      new Date(firstStart.getTime() + hour),
    );
    const lucia = await world.principalOf('lucia@example.com');
    const valeria = await world.principalOf('valeria@example.com');
    await world.book(first.id, lucia);
    await world.book(second.id, valeria);
    const luciaAllowance = await world.remainingAllowance(lucia);
    const valeriaAllowance = await world.remainingAllowance(valeria);
    const luciaNoticesBefore = (
      await world.sessionCancelledNotices('lucia@example.com')
    ).length;
    // The worker dies while settling the second Session: its transaction
    // rolls back, the first one stays committed.
    let crashed = false;
    const crashOnSecond = async (
      ...[transaction, notice]: Parameters<typeof recordNotification>
    ) => {
      if (!crashed && notice.businessEventKey.endsWith(second.id)) {
        crashed = true;
        throw new Error('worker stopped');
      }
      await recordNotification(transaction, notice);
    };

    world.setClock(new Date(second.startsAt.getTime() - lead));
    await expect(
      world.checks(crashOnSecond).checkMinimumBookings(),
    ).rejects.toThrow(`minimum_bookings_check failed for 1 item: ${second.id}`);
    await expect(sessionRow(first.id)).resolves.toMatchObject({
      state: 'CANCELLED',
    });
    await expect(sessionRow(second.id)).resolves.toMatchObject({
      state: 'SCHEDULED',
      minimumBookingsCheckCompletedAt: null,
    });

    await expect(world.checks().checkMinimumBookings()).resolves.toEqual({
      checked: 1,
      cancelled: 1,
    });
    await expect(sessionRow(second.id)).resolves.toMatchObject({
      state: 'CANCELLED',
      cancellationCause: 'MINIMUM_NOT_MET',
    });
    await expect(world.remainingAllowance(lucia)).resolves.toBe(
      luciaAllowance + 1,
    );
    await expect(world.remainingAllowance(valeria)).resolves.toBe(
      valeriaAllowance + 1,
    );
    await expect(
      world.sessionCancelledNotices('lucia@example.com'),
    ).resolves.toHaveLength(luciaNoticesBefore + 1);
  });

  it('settles the later Sessions when one throws, even a database error, then reports it', async () => {
    const first = await world.createSession(slotStart(8));
    const broken = await world.createSession(
      new Date(slotStart(8).getTime() + hour),
    );
    const later = await world.createSession(
      new Date(slotStart(8).getTime() + 2 * hour),
    );
    const lucia = await world.principalOf('lucia@example.com');
    await world.book(first.id, lucia);
    const failTheMiddle = async (
      ...[transaction, notice]: Parameters<typeof recordNotification>
    ) => {
      if (notice.businessEventKey.endsWith(broken.id)) {
        throw new Prisma.PrismaClientKnownRequestError('session broke', {
          code: 'P2010',
          clientVersion: 'test',
        });
      }
      await recordNotification(transaction, notice);
    };
    // All three sit inside the lead window only once the latest is due.
    // A clock at the first Session's lead leaves the later two for a future sweep.
    const due = new Date(later.startsAt.getTime() - lead);
    world.setClock(due);

    await expect(
      world.checks(failTheMiddle).checkMinimumBookings(),
    ).rejects.toThrow(`minimum_bookings_check failed for 1 item: ${broken.id}`);
    await expect(sessionRow(first.id)).resolves.toMatchObject({
      state: 'CANCELLED',
    });
    await expect(sessionRow(broken.id)).resolves.toMatchObject({
      state: 'SCHEDULED',
      minimumBookingsCheckCompletedAt: null,
    });
    await expect(sessionRow(later.id)).resolves.toMatchObject({
      state: 'CANCELLED',
    });
  });
});
