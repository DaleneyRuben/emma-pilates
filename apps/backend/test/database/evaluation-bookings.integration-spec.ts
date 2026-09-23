import { randomUUID } from 'node:crypto';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import {
  branchIdOf,
  codeOf,
  EvaluationTestWorld,
  fixtureNow,
  startEvaluationTestWorld,
} from './evaluation-test-support';

const civil = (date: string): Date => new Date(`${date}T00:00:00.000Z`);
const at = (instant: string): Date => new Date(instant);

describe('Prisma evaluation booking commands', () => {
  let world: EvaluationTestWorld;
  let clock = fixtureNow;
  const commands = () =>
    createPrismaEvaluationCommands(world.prisma, { now: () => clock });

  let mondayBlockId: string;
  let wednesdayBlockId: string;
  const ids: Record<string, string> = {};

  const slotAt = async (availabilityBlockId: string, startsAt: string) =>
    (
      await world.prisma.evaluationSlot.findUniqueOrThrow({
        where: {
          availabilityBlockId_startsAt: {
            availabilityBlockId,
            startsAt: at(startsAt),
          },
        },
        select: { id: true },
      })
    ).id;

  const notificationsOf = (email: string, type: string) =>
    world.prisma.notification.findMany({
      where: { account: { email }, type },
      select: {
        category: true,
        businessEventKey: true,
        title: true,
        message: true,
        destinationType: true,
        destinationId: true,
      },
    });

  const settle = async <T>(work: Promise<T>) =>
    work.then(
      (value) => ({ ok: true as const, value }),
      async (error: unknown) => ({
        ok: false as const,
        code: await codeOf(Promise.reject(error as Error)),
      }),
    );

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    const carla = await world.principalOf('carla@example.com');
    mondayBlockId = (
      await commands().createAvailabilityBlock(
        {
          branchId: branchIdOf('centro'),
          weekday: 1,
          startsAtLocal: '09:00',
          endsAtLocal: '13:00',
          effectiveFrom: civil('2026-09-21'),
        },
        carla,
        randomUUID(),
      )
    ).id;
    wednesdayBlockId = (
      await commands().createAvailabilityBlock(
        {
          branchId: branchIdOf('centro'),
          weekday: 3,
          startsAtLocal: '20:15',
          endsAtLocal: '21:00',
          effectiveFrom: civil('2026-09-21'),
        },
        carla,
        randomUUID(),
      )
    ).id;
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

    // September 30 at 20:15 in Bolivia is October 1 in UTC but still September.
    await expect(
      codeOf(
        commands().bookEvaluation(
          await slotAt(wednesdayBlockId, '2026-10-01T00:15:00.000Z'),
          lucia,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('evaluation_month_used');
    const browse = await commands().listBookableSlots({}, lucia);
    expect(browse.days.every((day) => day.date >= civil('2026-10-01'))).toBe(
      true,
    );
    expect(browse.months).toEqual([
      {
        month: civil('2026-09-01'),
        status: 'used',
        evaluation: { id: evaluation.id, startsAt: evaluation.startsAt },
      },
      { month: civil('2026-10-01'), status: 'available', evaluation: null },
    ]);

    ids.luciaOctober = (
      await commands().bookEvaluation(
        await slotAt(mondayBlockId, '2026-10-05T13:00:00.000Z'),
        lucia,
        randomUUID(),
      )
    ).id;
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

    const isabel = await world.prisma.account.findUniqueOrThrow({
      where: { email: 'isabel@example.com' },
      select: {
        id: true,
        client: {
          select: { id: true, subscriptions: { select: { id: true } } },
        },
      },
    });
    const futureSession = await world.prisma.session.findFirstOrThrow({
      where: {
        state: 'SCHEDULED',
        startsAt: { gt: at('2026-09-22T00:00:00.000Z') },
      },
      orderBy: { startsAt: 'asc' },
      select: { id: true },
    });
    await world.prisma.booking.create({
      data: {
        sessionId: futureSession.id,
        clientId: isabel.client!.id,
        subscriptionId: isabel.client!.subscriptions[0].id,
        createdByAccountId: isabel.id,
      },
    });
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
      items: [{ id: ids.luciaSeptember }, { id: ids.luciaOctober }],
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

    await commands().cancelClientEvaluation(ids.luciaOctober, lucia);
    await expect(
      commands().cancelClientEvaluation(ids.luciaOctober, lucia),
    ).resolves.toBeUndefined();
    await expect(
      world.prisma.evaluation.findUniqueOrThrow({
        where: { id: ids.luciaOctober },
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
      { businessEventKey: `evaluation-cancelled:${ids.luciaOctober}` },
    ]);
    await expect(
      commands().listClientEvaluations({ scope: 'upcoming' }, lucia),
    ).resolves.toMatchObject({ items: [{ id: ids.luciaSeptember }] });

    // The freed slot is bookable again, as her October follow-up.
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
        evaluationId: ids.luciaSeptember,
        clientName: 'Lucía Fernández',
        startsAt: at('2026-09-28T13:45:00.000Z'),
        durationMinutes: 45,
        branchName: 'Centro',
        kind: 'first',
      }),
      expect.objectContaining({
        evaluationId: ids.isabelSeptember,
        clientName: 'Isabel Arce',
        kind: 'first',
      }),
    ]);
    expect(firstPage.hasMore).toBe(true);
    await expect(
      commands().listNutritionistAgenda(
        { limit: 2, cursor: firstPage.nextCursor! },
        carla,
      ),
    ).resolves.toMatchObject({
      items: [{ evaluationId: ids.luciaFollowUp, kind: 'follow_up' }],
      hasMore: false,
    });
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

  it('serializes competing bookings of one slot, one month, and a slot being withdrawn', async () => {
    const bea = await world.principalOf('bea@example.com');
    const isabel = await world.principalOf('isabel@example.com');
    const ana = await world.principalOf('ana@example.com');

    const sameSlot = await slotAt(mondayBlockId, '2026-10-19T13:00:00.000Z');
    const slotRace = await Promise.all([
      settle(commands().bookEvaluation(sameSlot, bea, randomUUID())),
      settle(commands().bookEvaluation(sameSlot, ana, randomUUID())),
    ]);
    expect(slotRace.filter((outcome) => outcome.ok)).toHaveLength(1);
    expect(slotRace.find((outcome) => !outcome.ok)).toEqual({
      ok: false,
      code: 'evaluation_slot_unavailable',
    });

    const monthRace = await Promise.all([
      settle(
        commands().bookEvaluation(
          await slotAt(mondayBlockId, '2026-09-28T15:15:00.000Z'),
          ana,
          randomUUID(),
        ),
      ),
      settle(
        commands().bookEvaluation(
          await slotAt(wednesdayBlockId, '2026-10-01T00:15:00.000Z'),
          ana,
          randomUUID(),
        ),
      ),
    ]);
    expect(monthRace.filter((outcome) => outcome.ok)).toHaveLength(1);
    expect(monthRace.find((outcome) => !outcome.ok)).toEqual({
      ok: false,
      code: 'evaluation_month_used',
    });

    const noa = await world.principalOf('noa@example.com');
    const tuesday = await commands().createAvailabilityBlock(
      {
        branchId: branchIdOf('centro'),
        weekday: 2,
        startsAtLocal: '09:00',
        endsAtLocal: '09:45',
        effectiveFrom: civil('2026-09-22'),
      },
      noa,
      randomUUID(),
    );
    const contested = await slotAt(tuesday.id, '2026-10-06T13:00:00.000Z');
    const [booking, ending] = await Promise.all([
      settle(commands().bookEvaluation(contested, isabel, randomUUID())),
      settle(
        commands().endAvailabilityBlock(
          { blockId: tuesday.id, effectiveFrom: civil('2026-10-06') },
          noa,
        ),
      ),
    ]);
    expect(ending.ok).toBe(true);
    const slot = await world.prisma.evaluationSlot.findUniqueOrThrow({
      where: { id: contested },
      select: { state: true, _count: { select: { evaluations: true } } },
    });
    if (booking.ok) {
      expect(slot).toEqual({ state: 'PUBLISHED', _count: { evaluations: 1 } });
      expect(ending).toMatchObject({ value: { keptEvaluations: 1 } });
    } else {
      expect(booking.code).toBe('evaluation_slot_unavailable');
      expect(slot).toEqual({ state: 'WITHDRAWN', _count: { evaluations: 0 } });
    }
  });

  it('records day and hour reminders once each within their windows and lets staff cancel before the start', async () => {
    const lucia = await world.principalOf('lucia@example.com');
    const carla = await world.principalOf('carla@example.com');

    clock = at('2026-09-27T13:50:00.000Z');
    await commands().sendDueEvaluationReminders();
    await commands().sendDueEvaluationReminders();
    await expect(
      notificationsOf('lucia@example.com', 'evaluation_reminder_day'),
    ).resolves.toEqual([
      {
        category: 'REMINDER',
        businessEventKey: `evaluation-reminder-day:${ids.luciaSeptember}`,
        title: 'Recordatorio',
        message:
          'Recordatorio: tu evaluación nutricional es mañana a las 09:45.',
        destinationType: 'evaluation',
        destinationId: ids.luciaSeptember,
      },
    ]);

    // Ana books inside the day window, so she only gets the hour reminder.
    clock = at('2026-09-27T20:00:00.000Z');
    const anaSeptember = await world.prisma.evaluation.findFirst({
      where: {
        client: { name: 'Ana Justiniano' },
        state: 'BOOKED',
        eligibilityMonth: civil('2026-09-01'),
      },
      select: { id: true },
    });
    if (anaSeptember !== null) {
      await commands().cancelClientEvaluation(
        anaSeptember.id,
        await world.principalOf('ana@example.com'),
      );
    }
    ids.anaLate = (
      await commands().bookEvaluation(
        await slotAt(mondayBlockId, '2026-09-28T16:00:00.000Z'),
        await world.principalOf('ana@example.com'),
        randomUUID(),
      )
    ).id;

    clock = at('2026-09-28T12:50:00.000Z');
    await expect(
      codeOf(commands().cancelClientEvaluation(ids.luciaSeptember, lucia)),
    ).resolves.toBe('evaluation_cancellation_window_closed');
    await commands().cancelEvaluationAsStaff(ids.isabelSeptember, carla);
    await commands().sendDueEvaluationReminders();

    await expect(
      notificationsOf('lucia@example.com', 'evaluation_reminder_hour'),
    ).resolves.toMatchObject([
      {
        businessEventKey: `evaluation-reminder-hour:${ids.luciaSeptember}`,
        message:
          'Recordatorio: tu evaluación nutricional es en una hora, a las 09:45.',
      },
    ]);
    await expect(
      notificationsOf('isabel@example.com', 'evaluation_cancelled_by_studio'),
    ).resolves.toEqual([
      {
        category: 'BOOKING_SCHEDULE',
        businessEventKey: `evaluation-cancelled:${ids.isabelSeptember}`,
        title: 'Evaluación cancelada',
        message:
          'El estudio canceló tu evaluación nutricional del lunes 28 de septiembre, 10:30. Ya puedes reservar otra este mes.',
        destinationType: 'evaluation',
        destinationId: ids.isabelSeptember,
      },
    ]);
    await expect(
      notificationsOf('isabel@example.com', 'evaluation_reminder_day'),
    ).resolves.toEqual([]);
    await expect(
      world.prisma.auditRecord.findMany({
        where: { actionCode: 'evaluation.cancelled_by_staff' },
        select: {
          actorAccountId: true,
          actorRole: true,
          targetType: true,
          targetId: true,
          branchId: true,
          metadata: true,
        },
      }),
    ).resolves.toEqual([
      {
        actorAccountId: carla.accountId,
        actorRole: 'NUTRITIONIST',
        targetType: 'evaluation',
        targetId: ids.isabelSeptember,
        branchId: branchIdOf('centro'),
        metadata: { cause: 'staff_cancelled', insideClientWindow: true },
      },
    ]);
    await expect(
      codeOf(
        commands().cancelEvaluationAsStaff(
          ids.anaLate,
          await world.principalOf('noa@example.com'),
        ),
      ),
    ).resolves.toBe('booking_access_denied');
    await expect(
      codeOf(
        commands().cancelEvaluationAsStaff(
          ids.anaLate,
          await world.principalOf('camila.rojas@example.com'),
        ),
      ),
    ).resolves.toBe('booking_access_denied');

    clock = at('2026-09-28T15:10:00.000Z');
    await commands().sendDueEvaluationReminders();
    await expect(
      notificationsOf('ana@example.com', 'evaluation_reminder_hour'),
    ).resolves.toHaveLength(1);
    await expect(
      notificationsOf('ana@example.com', 'evaluation_reminder_day'),
    ).resolves.toEqual([]);
    await commands().cancelEvaluationAsStaff(
      ids.anaLate,
      await world.principalOf('paola.mendoza@example.com'),
    );
    await expect(
      codeOf(commands().cancelEvaluationAsStaff(ids.luciaSeptember, carla)),
    ).resolves.toBe('evaluation_started');
  });

  it('pages past Evaluations newest first and omits cancelled ones', async () => {
    const lucia = await world.principalOf('lucia@example.com');
    clock = at('2026-10-20T00:00:00.000Z');

    const first = await commands().listClientEvaluations(
      { scope: 'past', limit: 1 },
      lucia,
    );
    expect(first).toMatchObject({
      items: [{ id: ids.luciaFollowUp, cancellable: false }],
      hasMore: true,
    });
    await expect(
      commands().listClientEvaluations(
        { scope: 'past', limit: 1, cursor: first.nextCursor! },
        lucia,
      ),
    ).resolves.toMatchObject({
      items: [{ id: ids.luciaSeptember }],
      hasMore: false,
      nextCursor: null,
    });
    await expect(
      commands().listClientEvaluations({ scope: 'upcoming' }, lucia),
    ).resolves.toMatchObject({ items: [] });
  });
});
