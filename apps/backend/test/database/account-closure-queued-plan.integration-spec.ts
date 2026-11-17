import { createPrismaAccountClosure } from '../../src/booking/account-closure/prisma-account-closure';
import {
  closureNow,
  closurePassword,
  ClosureWorld,
  startClosureWorld,
} from './account-closure-test-support';

// Walkthrough n.º 78: closing her Account also ends a Plan she already paid
// that had not started yet, as Cerrar mi cuenta now says.
describe('closing a Client Account with a queued Plan (PostgreSQL)', () => {
  let world: ClosureWorld;

  beforeAll(async () => {
    world = await startClosureWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('ends the current and the queued Subscription', async () => {
    const lucia = await world.newClient('Lucía Cierre');
    const current = await world.prisma.subscription.findUniqueOrThrow({
      where: { id: lucia.subscriptionId },
      select: { planId: true, endsOn: true },
    });
    const queued = await world.prisma.subscription.create({
      data: {
        clientId: lucia.clientId,
        planId: current.planId,
        planNameSnapshot: 'Trimestral 24 clases',
        durationDaysSnapshot: 90,
        originalClassAllowance: 24,
        remainingClassAllowance: 24,
        startsOn: new Date(current.endsOn.getTime() + 24 * 60 * 60 * 1_000),
        endsOn: new Date(current.endsOn.getTime() + 90 * 24 * 60 * 60 * 1_000),
        activatedAt: closureNow,
      },
      select: { id: true },
    });

    await createPrismaAccountClosure(world.prisma, {
      now: () => closureNow,
    }).close(
      { clientId: lucia.clientId, password: closurePassword },
      lucia.principal,
    );

    await expect(
      world.prisma.subscription.findMany({
        where: { clientId: lucia.clientId },
        select: { id: true, state: true },
        orderBy: { startsOn: 'asc' },
      }),
    ).resolves.toEqual([
      { id: lucia.subscriptionId, state: 'EXPIRED' },
      { id: queued.id, state: 'EXPIRED' },
    ]);
  });
});
