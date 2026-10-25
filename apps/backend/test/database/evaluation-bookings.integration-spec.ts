import { randomUUID } from 'node:crypto';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import {
  at,
  bookIsabelFutureSession,
  civil,
  createCarlaBlocks,
  grantQuarterlySubscription,
  notificationsTo,
  slotIdAt,
} from './evaluation-bookings-test-support';
import {
  branchIdOf,
  codeOf,
  EvaluationTestWorld,
  fixtureNow,
  startEvaluationTestWorld,
} from './evaluation-test-support';

describe('Prisma evaluation booking commands', () => {
  let world: EvaluationTestWorld;
  const clock = fixtureNow;
  const commands = () =>
    createPrismaEvaluationCommands(world.prisma, { now: () => clock });

  let mondayBlockId: string;
  let wednesdayBlockId: string;
  const ids: Record<string, string> = {};

  const slotAt = (availabilityBlockId: string, startsAt: string) =>
    slotIdAt(world.prisma, availabilityBlockId, startsAt);
  const notificationsOf = (email: string, type: string) =>
    notificationsTo(world.prisma, email, type);

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    ({ mondayBlockId, wednesdayBlockId } = await createCarlaBlocks(
      world,
      commands(),
    ));
    await grantQuarterlySubscription(world.prisma, 'lucia@example.com');
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('lists bookable slots by Bolivia date with the monthly eligibility summary', async () => {
    const lucia = await world.principalOf('lucia@example.com');

    const browse = await commands().listBookableSlots({}, lucia);
    const carlaDays = browse.days
      .map((day) => ({
        ...day,
        slots: day.slots.filter(
          (slot) => slot.nutritionistName === 'Carla Rivas',
        ),
      }))
      .filter((day) => day.slots.length > 0);

    // Today's 11:15 and 12:00 slots start within 3 hours, so the first
    // bookable Carla slot is Wednesday evening.
    expect(carlaDays[0]).toEqual({
      date: civil('2026-09-23'),
      slots: [
        {
          id: await slotAt(wednesdayBlockId, '2026-09-24T00:15:00.000Z'),
          startsAt: at('2026-09-24T00:15:00.000Z'),
          endsAt: at('2026-09-24T01:00:00.000Z'),
          durationMinutes: 45,
          branchId: branchIdOf('centro'),
          branchName: 'Centro',
          nutritionistName: 'Carla Rivas',
          bookable: true,
          included: true,
          priceCentavos: 0,
        },
      ],
    });
    expect(carlaDays.map((day) => day.date)).toContainEqual(
      civil('2026-10-19'),
    );
    expect(browse.months).toEqual([
      { month: civil('2026-09-01'), status: 'available', evaluation: null },
      { month: civil('2026-10-01'), status: 'available', evaluation: null },
    ]);
    await expect(
      commands().readEvaluationSlot(
        await slotAt(mondayBlockId, '2026-09-21T16:00:00.000Z'),
        lucia,
      ),
    ).resolves.toMatchObject({
      bookable: false,
      nutritionistName: 'Carla Rivas',
    });
    await expect(
      codeOf(
        commands().listBookableSlots(
          {},
          await world.principalOf('carla@example.com'),
        ),
      ),
    ).resolves.toBe('booking_access_denied');
  });

  it('books a free Evaluation for the slot’s Bolivia month without consuming allowance and notifies the Nutritionist', async () => {
    const lucia = await world.principalOf('lucia@example.com');
    const key = randomUUID();
    const slotId = await slotAt(mondayBlockId, '2026-09-28T13:45:00.000Z');

    const evaluation = await commands().bookEvaluation(slotId, lucia, key);
    ids.luciaSeptember = evaluation.id;

    expect(evaluation).toMatchObject({
      slotId,
      state: 'booked',
      startsAt: at('2026-09-28T13:45:00.000Z'),
      endsAt: at('2026-09-28T14:30:00.000Z'),
      durationMinutes: 45,
      branchName: 'Centro',
      nutritionistName: 'Carla Rivas',
      cancellableUntil: at('2026-09-28T10:45:00.000Z'),
      cancellable: true,
    });
    await expect(
      world.prisma.subscription.findFirstOrThrow({
        where: { client: { account: { email: 'lucia@example.com' } } },
        select: { remainingClassAllowance: true },
      }),
    ).resolves.toEqual({ remainingClassAllowance: 5 });
    await expect(
      notificationsOf('carla@example.com', 'evaluation_booked'),
    ).resolves.toEqual([
      {
        category: 'BOOKING_SCHEDULE',
        businessEventKey: `evaluation-booked:${evaluation.id}`,
        title: 'Nueva evaluación',
        message:
          'Nueva evaluación agendada: lunes 28 de septiembre, 09:45, con Lucía Fernández.',
        destinationType: 'nutritionist_agenda',
        destinationId: null,
      },
    ]);

    await expect(
      commands().bookEvaluation(slotId, lucia, key),
    ).resolves.toMatchObject({ id: evaluation.id });
    await expect(
      codeOf(
        commands().bookEvaluation(
          await slotAt(mondayBlockId, '2026-10-05T13:00:00.000Z'),
          lucia,
          key,
        ),
      ),
    ).resolves.toBe('idempotency_key_reused');

    // The included Evaluation is one per Plan, including a later month.
    await expect(
      codeOf(
        commands().bookEvaluation(
          await slotAt(mondayBlockId, '2026-10-05T13:00:00.000Z'),
          lucia,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('evaluation_payment_required');
    const browse = await commands().listBookableSlots({}, lucia);
    expect(browse.months).toEqual([
      {
        month: civil('2026-09-01'),
        status: 'used',
        evaluation: { id: evaluation.id, startsAt: evaluation.startsAt },
      },
      { month: civil('2026-10-01'), status: 'available', evaluation: null },
    ]);
  });

  it('refuses taken, closed, and missing slots, ineligible Subscriptions, and staff callers', async () => {
    const ana = await world.principalOf('ana@example.com');
    const book = async (
      email: string,
      startsAt: string,
      block = mondayBlockId,
    ) =>
      codeOf(
        commands().bookEvaluation(
          await slotAt(block, startsAt),
          await world.principalOf(email),
          randomUUID(),
        ),
      );

    await expect(
      book('ana@example.com', '2026-09-28T13:45:00.000Z'),
    ).resolves.toBe('evaluation_slot_unavailable');
    await expect(
      book('ana@example.com', '2026-09-21T16:00:00.000Z'),
    ).resolves.toBe('evaluation_booking_closed');
    await expect(
      codeOf(commands().bookEvaluation(randomUUID(), ana, randomUUID())),
    ).resolves.toBe('evaluation_slot_not_found');
    // Valeria's Subscription ends on September 24; Sofía's expired; Mariana
    // has none; Isabel has no classes left and no future booked Session.
    for (const email of [
      'valeria@example.com',
      'sofia@example.com',
      'mariana@example.com',
      'isabel@example.com',
    ]) {
      await expect(book(email, '2026-09-28T13:00:00.000Z')).resolves.toBe(
        'no_eligible_subscription',
      );
    }
    await expect(
      book('camila.rojas@example.com', '2026-09-28T13:00:00.000Z'),
    ).resolves.toBe('booking_access_denied');

    await bookIsabelFutureSession(world);
    await grantQuarterlySubscription(world.prisma, 'isabel@example.com');
    ids.isabelSeptember = (
      await commands().bookEvaluation(
        await slotAt(mondayBlockId, '2026-09-28T14:30:00.000Z'),
        await world.principalOf('isabel@example.com'),
        randomUUID(),
      )
    ).id;
  });

  it('lets the Client list and cancel their own upcoming Evaluations, freeing the month', async () => {
    const lucia = await world.principalOf('lucia@example.com');

    await expect(
      commands().listClientEvaluations({ scope: 'upcoming' }, lucia),
    ).resolves.toMatchObject({
      items: [{ id: ids.luciaSeptember }],
      nextCursor: null,
    });
    await expect(
      codeOf(
        commands().cancelClientEvaluation(
          ids.luciaSeptember,
          await world.principalOf('ana@example.com'),
        ),
      ),
    ).resolves.toBe('booking_access_denied');
    await expect(
      codeOf(commands().cancelClientEvaluation(randomUUID(), lucia)),
    ).resolves.toBe('evaluation_not_found');

    await commands().cancelClientEvaluation(ids.luciaSeptember, lucia);
    await expect(
      commands().cancelClientEvaluation(ids.luciaSeptember, lucia),
    ).resolves.toBeUndefined();
    await expect(
      world.prisma.evaluation.findUniqueOrThrow({
        where: { id: ids.luciaSeptember },
        select: {
          state: true,
          cancellationCause: true,
          cancelledByAccountId: true,
        },
      }),
    ).resolves.toEqual({
      state: 'CANCELLED',
      cancellationCause: 'CLIENT_REQUEST',
      cancelledByAccountId: lucia.accountId,
    });
    await expect(
      notificationsOf('carla@example.com', 'evaluation_cancelled'),
    ).resolves.toMatchObject([
      { businessEventKey: `evaluation-cancelled:${ids.luciaSeptember}` },
    ]);
    await expect(
      commands().listClientEvaluations({ scope: 'upcoming' }, lucia),
    ).resolves.toMatchObject({ items: [] });

    // An early cancellation frees the included Evaluation.
    ids.luciaFollowUp = (
      await commands().bookEvaluation(
        await slotAt(mondayBlockId, '2026-10-05T13:00:00.000Z'),
        lucia,
        randomUUID(),
      )
    ).id;
  });

  it('shows the Nutritionist their own agenda with derived first and follow-up kinds', async () => {
    const carla = await world.principalOf('carla@example.com');

    const firstPage = await commands().listNutritionistAgenda(
      { limit: 2 },
      carla,
    );
    expect(firstPage.items).toEqual([
      expect.objectContaining({
        evaluationId: ids.isabelSeptember,
        clientName: 'Isabel Arce',
        startsAt: at('2026-09-28T14:30:00.000Z'),
        durationMinutes: 45,
        branchName: 'Centro',
        kind: 'first',
      }),
      expect.objectContaining({
        evaluationId: ids.luciaFollowUp,
        clientName: 'Lucía Fernández',
        kind: 'first',
      }),
    ]);
    expect(firstPage.hasMore).toBe(false);
    await expect(
      commands().listNutritionistAgenda(
        {},
        await world.principalOf('noa@example.com'),
      ),
    ).resolves.toMatchObject({ items: [] });
    await expect(
      codeOf(
        commands().listNutritionistAgenda(
          {},
          await world.principalOf('camila.rojas@example.com'),
        ),
      ),
    ).resolves.toBe('booking_access_denied');
  });
});
