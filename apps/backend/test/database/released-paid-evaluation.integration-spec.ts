import { randomUUID } from 'node:crypto';
import { createPrismaOversight } from '../../src/booking/administration/prisma-oversight';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import {
  createCarlaBlocks,
  slotIdAt,
} from './evaluation-bookings-test-support';
import {
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

// Walkthrough findings 67 and 68 (FIX-056): once the Nutritionist cancels a
// confirmed Paid Evaluation, its slot is free and the Client owes the studio
// nothing but a new choice. No agenda lists it at the old time, no reminder
// names that time, and the Client keeps it among her upcoming Evaluations,
// flagged, until she picks another slot.
describe('a paid evaluation whose slot the studio released', () => {
  let world: EvaluationTestWorld;
  let mondayBlockId: string;
  let releasedId: string;
  const startsAt = '2026-09-28T13:00:00.000Z';
  const commands = (now: Date = fixtureNow) =>
    createPrismaEvaluationCommands(world.prisma, { now: () => now });
  const lucia = () => world.principalOf('lucia@example.com');
  const carla = () => world.principalOf('carla@example.com');

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    ({ mondayBlockId } = await createCarlaBlocks(world, commands()));
    const slotId = await slotIdAt(world.prisma, mondayBlockId, startsAt);
    const booked = await commands().bookPaidEvaluation(
      slotId,
      await lucia(),
      randomUUID(),
    );
    await createPrismaPaymentCommands(world.prisma, {
      now: () => fixtureNow,
    }).confirmTransfer(
      { paymentId: booked.paymentId! },
      await world.principalOf('paola.mendoza@example.com'),
    );
    await commands().cancelEvaluationAsStaff(booked.id, await carla());
    releasedId = booked.id;
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('leaves the Nutritionist agenda and her block count', async () => {
    const agenda = await commands().listNutritionistAgenda({}, await carla());
    expect(agenda.items.map((item) => item.evaluationId)).not.toContain(
      releasedId,
    );
    const blocks = await commands().listAvailabilityBlocks(await carla());
    expect(
      blocks.find((block) => block.id === mondayBlockId)?.upcomingBookedCount,
    ).toBe(0);
  });

  it('leaves the administrator Horario › Nutrición list', async () => {
    const page = await createPrismaOversight(world.prisma, {
      now: () => fixtureNow,
    }).listEvaluations(
      {
        from: new Date('2026-09-21T04:00:00.000Z'),
        until: new Date('2026-10-05T04:00:00.000Z'),
        page: 1,
        pageSize: 20,
      },
      await world.principalOf('paola.mendoza@example.com'),
    );
    expect(page.items.map((item) => item.evaluationId)).not.toContain(
      releasedId,
    );
    expect(page.totalItems).toBe(0);
  });

  it('tells the Client her slot was released, even after its old time', async () => {
    const before = await commands().listClientEvaluations(
      { scope: 'upcoming' },
      await lucia(),
    );
    expect(before.items).toEqual([
      expect.objectContaining({ id: releasedId, slotReleased: true }),
    ]);

    const afterOldTime = commands(new Date('2026-09-28T15:00:00.000Z'));
    const upcoming = await afterOldTime.listClientEvaluations(
      { scope: 'upcoming' },
      await lucia(),
    );
    const past = await afterOldTime.listClientEvaluations(
      { scope: 'past' },
      await lucia(),
    );
    expect(upcoming.items.map((item) => item.id)).toEqual([releasedId]);
    expect(past.items.map((item) => item.id)).not.toContain(releasedId);
  });

  it('sends no reminder for the released time', async () => {
    await commands(
      new Date('2026-09-27T15:00:00.000Z'),
    ).sendDueEvaluationReminders();
    await expect(
      world.prisma.notification.count({
        where: { type: { startsWith: 'evaluation_reminder' } },
      }),
    ).resolves.toBe(0);
  });
});
