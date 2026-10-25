import { randomUUID } from 'node:crypto';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import {
  at,
  bookIsabelFutureSession,
  civil,
  createCarlaBlocks,
  grantQuarterlySubscription,
  notificationsTo,
  settle,
  slotIdAt,
} from './evaluation-bookings-test-support';
import {
  branchIdOf,
  codeOf,
  EvaluationTestWorld,
  fixtureNow,
  startEvaluationTestWorld,
} from './evaluation-test-support';

describe('Prisma evaluation booking commands (races and reminders)', () => {
  let world: EvaluationTestWorld;
  let clock = fixtureNow;
  const commands = () =>
    createPrismaEvaluationCommands(world.prisma, { now: () => clock });

  let mondayBlockId: string;
  let wednesdayBlockId: string;
  const ids: Record<string, string> = {};

  const slotAt = (availabilityBlockId: string, startsAt: string) =>
    slotIdAt(world.prisma, availabilityBlockId, startsAt);
  const notificationsOf = (email: string, type: string) =>
    notificationsTo(world.prisma, email, type);

  // Replays the state the evaluation-bookings spec leaves behind: Lucía's
  // cancelled September Evaluation, her October follow-up, and Isabel's
  // September Evaluation. Both hold a 90-day Plan.
  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    ({ mondayBlockId, wednesdayBlockId } = await createCarlaBlocks(
      world,
      commands(),
    ));
    await grantQuarterlySubscription(world.prisma, 'lucia@example.com');
    const lucia = await world.principalOf('lucia@example.com');
    const book = async (startsAt: string, principal = lucia) =>
      (
        await commands().bookEvaluation(
          await slotAt(mondayBlockId, startsAt),
          principal,
          randomUUID(),
        )
      ).id;
    ids.luciaSeptember = await book('2026-09-28T13:45:00.000Z');
    ids.luciaFollowUp = ids.luciaSeptember;
    await bookIsabelFutureSession(world);
    await grantQuarterlySubscription(world.prisma, 'isabel@example.com');
    ids.isabelSeptember = await book(
      '2026-09-28T14:30:00.000Z',
      await world.principalOf('isabel@example.com'),
    );
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('serializes competing bookings of one slot, one month, and a slot being withdrawn', async () => {
    const bea = await world.principalOf('bea@example.com');
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
      code: 'evaluation_payment_required',
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
    await grantQuarterlySubscription(world.prisma, 'valeria@example.com');
    const valeria = await world.principalOf('valeria@example.com');
    const [booking, ending] = await Promise.all([
      settle(commands().bookEvaluation(contested, valeria, randomUUID())),
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
      items: [{ id: ids.luciaSeptember, cancellable: false }],
      hasMore: false,
    });
    await expect(
      commands().listClientEvaluations({ scope: 'upcoming' }, lucia),
    ).resolves.toMatchObject({ items: [] });
  });
});
