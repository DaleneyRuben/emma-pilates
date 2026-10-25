import { randomUUID } from 'node:crypto';
import {
  createPrismaEvaluationCommands,
  endNutritionistAvailability,
} from '../../src/booking/evaluations/prisma-evaluation-commands';
import { grantQuarterlySubscription } from './evaluation-bookings-test-support';
import {
  branchIdOf,
  codeOf,
  EvaluationTestWorld,
  fixtureNow,
  startEvaluationTestWorld,
} from './evaluation-test-support';

const civil = (date: string): Date => new Date(`${date}T00:00:00.000Z`);
const at = (instant: string): Date => new Date(instant);

describe('Prisma evaluation availability commands', () => {
  let world: EvaluationTestWorld;
  let clock = fixtureNow;
  const commands = () =>
    createPrismaEvaluationCommands(world.prisma, { now: () => clock });

  const mondayMorning = {
    branchId: branchIdOf('centro'),
    weekday: 1,
    startsAtLocal: '09:00',
    endsAtLocal: '13:00',
    effectiveFrom: civil('2026-09-21'),
  };

  const publishedSlots = (availabilityBlockId: string) =>
    world.prisma.evaluationSlot.findMany({
      where: { availabilityBlockId, state: 'PUBLISHED' },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      select: { id: true, startsAt: true, endsAt: true, localMonth: true },
    });

  const slotAt = (availabilityBlockId: string, startsAt: string) =>
    world.prisma.evaluationSlot.findUniqueOrThrow({
      where: {
        availabilityBlockId_startsAt: {
          availabilityBlockId,
          startsAt: at(startsAt),
        },
      },
      select: { id: true, state: true },
    });

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    await grantQuarterlySubscription(world.prisma, 'lucia@example.com');
  });

  afterAll(async () => {
    await world?.stop();
  });

  let mondayBlockId: string;
  let replacementBlockId: string;
  let saturdayBlockId: string;

  it('publishes a block at an assigned Branch, materializes its 30-day horizon at once, and replays by idempotency key', async () => {
    const carla = await world.principalOf('carla@example.com');
    const key = randomUUID();

    const block = await commands().createAvailabilityBlock(
      mondayMorning,
      carla,
      key,
    );
    mondayBlockId = block.id;

    expect(block).toMatchObject({
      branchId: branchIdOf('centro'),
      branchName: 'Centro',
      weekday: 1,
      startsAtLocal: '09:00',
      endsAtLocal: '13:00',
      effectiveFrom: civil('2026-09-21'),
      effectiveUntil: null,
      slotsPerWeek: 5,
      upcomingBookedCount: 0,
    });

    // Today's 09:00, 09:45, and 10:30 already started at 11:00; then every
    // Monday through 2026-10-21 has five 45-minute slots.
    const slots = await publishedSlots(block.id);
    expect(slots).toHaveLength(22);
    expect(slots[0]).toMatchObject({
      startsAt: at('2026-09-21T15:15:00.000Z'),
      endsAt: at('2026-09-21T16:00:00.000Z'),
      localMonth: civil('2026-09-01'),
    });
    expect(slots.at(-1)?.startsAt).toEqual(at('2026-10-19T16:00:00.000Z'));

    await expect(
      commands().createAvailabilityBlock(mondayMorning, carla, key),
    ).resolves.toMatchObject({ id: block.id });
    await expect(publishedSlots(block.id)).resolves.toHaveLength(22);
    await expect(
      codeOf(
        commands().createAvailabilityBlock(
          { ...mondayMorning, weekday: 2 },
          carla,
          key,
        ),
      ),
    ).resolves.toBe('idempotency_key_reused');
  });

  it('refuses overlaps across Branches, invalid ranges, past dates, unassigned Branches, and other Roles', async () => {
    const carla = await world.principalOf('carla@example.com');
    const create = (values: Partial<typeof mondayMorning>, principal = carla) =>
      codeOf(
        commands().createAvailabilityBlock(
          { ...mondayMorning, ...values },
          principal,
          randomUUID(),
        ),
      );

    await expect(
      create({
        branchId: branchIdOf('equipetrol'),
        startsAtLocal: '12:00',
        endsAtLocal: '14:00',
      }),
    ).resolves.toBe('availability_block_overlap');
    await expect(create({ startsAtLocal: '09:10' })).resolves.toBe(
      'availability_block_invalid_range',
    );
    await expect(
      create({ startsAtLocal: '14:00', endsAtLocal: '14:30' }),
    ).resolves.toBe('availability_block_invalid_range');
    await expect(
      create({ weekday: 2, effectiveFrom: civil('2026-09-20') }),
    ).resolves.toBe('availability_block_effective_date_past');
    await expect(
      create({ weekday: 2, branchId: branchIdOf('urubo') }),
    ).resolves.toBe('branch_not_assigned');

    for (const email of [
      'emma.vargas@example.com',
      'camila.rojas@example.com',
      'paola.mendoza@example.com',
      'lucia@example.com',
    ]) {
      await expect(
        create({ weekday: 2 }, await world.principalOf(email)),
      ).resolves.toBe('booking_access_denied');
    }
  });

  it('lists the Nutritionist’s own current and scheduled blocks by weekday and start', async () => {
    const carla = await world.principalOf('carla@example.com');
    const saturday = await commands().createAvailabilityBlock(
      {
        branchId: branchIdOf('equipetrol'),
        weekday: 6,
        startsAtLocal: '09:00',
        endsAtLocal: '12:00',
        effectiveFrom: civil('2026-09-26'),
      },
      carla,
      randomUUID(),
    );
    saturdayBlockId = saturday.id;

    await expect(publishedSlots(saturday.id)).resolves.toHaveLength(16);
    await expect(commands().listAvailabilityBlocks(carla)).resolves.toEqual([
      expect.objectContaining({
        id: mondayBlockId,
        weekday: 1,
        slotsPerWeek: 5,
      }),
      expect.objectContaining({
        id: saturday.id,
        branchName: 'Equipetrol',
        weekday: 6,
        startsAtLocal: '09:00',
        endsAtLocal: '12:00',
        effectiveFrom: civil('2026-09-26'),
        slotsPerWeek: 4,
      }),
    ]);
    await expect(
      commands().listAvailabilityBlocks(
        await world.principalOf('noa@example.com'),
      ),
    ).resolves.toEqual([]);
    await expect(
      codeOf(
        commands().listAvailabilityBlocks(
          await world.principalOf('camila.rojas@example.com'),
        ),
      ),
    ).resolves.toBe('booking_access_denied');
  });

  it('replaces a block from a selected date, withdrawing unbooked slots and keeping booked Evaluations', async () => {
    const carla = await world.principalOf('carla@example.com');
    const ana = await world.principalOf('ana@example.com');
    const lucia = await world.principalOf('lucia@example.com');
    const kept = await slotAt(mondayBlockId, '2026-10-05T13:45:00.000Z');
    await commands().bookEvaluation(kept.id, ana, randomUUID());
    await commands().bookEvaluation(
      (await slotAt(mondayBlockId, '2026-09-28T13:00:00.000Z')).id,
      lucia,
      randomUUID(),
    );
    const key = randomUUID();
    const replacement = {
      blockId: mondayBlockId,
      branchId: branchIdOf('centro'),
      weekday: 1,
      startsAtLocal: '10:00',
      endsAtLocal: '13:00',
      effectiveFrom: civil('2026-10-05'),
    };

    const result = await commands().replaceAvailabilityBlock(
      replacement,
      carla,
      key,
    );
    replacementBlockId = result.replacement.id;

    expect(result).toMatchObject({
      ended: {
        id: mondayBlockId,
        effectiveUntil: civil('2026-10-05'),
        upcomingBookedCount: 2,
      },
      replacement: {
        weekday: 1,
        startsAtLocal: '10:00',
        endsAtLocal: '13:00',
        effectiveFrom: civil('2026-10-05'),
        effectiveUntil: null,
        slotsPerWeek: 4,
      },
      withdrawnSlots: 14,
      keptEvaluations: 1,
    });
    await expect(
      slotAt(mondayBlockId, '2026-10-05T13:45:00.000Z'),
    ).resolves.toEqual({ id: kept.id, state: 'PUBLISHED' });
    // The replacement's 10:00 slot on October 5 overlaps Ana's kept 09:45 slot.
    const replacementSlots = await publishedSlots(replacementBlockId);
    expect(replacementSlots).toHaveLength(11);
    expect(replacementSlots[0].startsAt).toEqual(
      at('2026-10-05T14:45:00.000Z'),
    );

    await expect(
      commands().replaceAvailabilityBlock(replacement, carla, key),
    ).resolves.toMatchObject({
      replacement: { id: replacementBlockId },
      withdrawnSlots: 14,
    });
    await expect(publishedSlots(replacementBlockId)).resolves.toHaveLength(11);
    await expect(
      codeOf(
        commands().replaceAvailabilityBlock(
          replacement,
          await world.principalOf('noa@example.com'),
          randomUUID(),
        ),
      ),
    ).resolves.toBe('booking_access_denied');
    await expect(
      codeOf(
        commands().replaceAvailabilityBlock(
          { ...replacement, blockId: randomUUID() },
          carla,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('availability_block_not_found');
  });

  it('withdraws a kept slot once its Evaluation is cancelled and lets the reconciler publish the replacement there', async () => {
    const ana = await world.principalOf('ana@example.com');
    const evaluation = await world.prisma.evaluation.findFirstOrThrow({
      where: { client: { name: 'Ana Justiniano' }, state: 'BOOKED' },
      select: { id: true, evaluationSlotId: true },
    });

    await commands().cancelClientEvaluation(evaluation.id, ana);

    await expect(
      world.prisma.evaluationSlot.findUniqueOrThrow({
        where: { id: evaluation.evaluationSlotId },
        select: { state: true },
      }),
    ).resolves.toEqual({ state: 'WITHDRAWN' });

    await commands().materializeAvailability();
    const slots = await publishedSlots(replacementBlockId);
    expect(slots).toHaveLength(12);
    expect(slots[0].startsAt).toEqual(at('2026-10-05T14:00:00.000Z'));
  });

  it('ends a block from a selected date, retries equivalently, and only moves an existing end earlier', async () => {
    const carla = await world.principalOf('carla@example.com');
    const end = (effectiveFrom: string, principal = carla) =>
      commands().endAvailabilityBlock(
        { blockId: replacementBlockId, effectiveFrom: civil(effectiveFrom) },
        principal,
      );

    await expect(end('2026-10-12')).resolves.toMatchObject({
      block: { id: replacementBlockId, effectiveUntil: civil('2026-10-12') },
      withdrawnSlots: 8,
      keptEvaluations: 0,
    });
    await expect(end('2026-10-12')).resolves.toMatchObject({
      block: { effectiveUntil: civil('2026-10-12') },
      withdrawnSlots: 0,
    });
    await expect(codeOf(end('2026-10-19'))).resolves.toBe(
      'availability_block_ended',
    );
    await expect(codeOf(end('2026-09-20'))).resolves.toBe(
      'availability_block_effective_date_past',
    );
    await expect(
      codeOf(end('2026-10-05', await world.principalOf('noa@example.com'))),
    ).resolves.toBe('booking_access_denied');
    await expect(end('2026-10-05')).resolves.toMatchObject({
      block: { effectiveUntil: civil('2026-10-05') },
      withdrawnSlots: 4,
    });
    await expect(publishedSlots(replacementBlockId)).resolves.toHaveLength(0);
  });

  it('extends the horizon as Bolivia days pass and treats concurrent reconciler runs as no-ops', async () => {
    clock = at('2026-09-24T15:00:00.000Z');

    await Promise.all([
      commands().materializeAvailability(),
      commands().materializeAvailability(),
    ]);

    const slots = await publishedSlots(saturdayBlockId);
    expect(slots).toHaveLength(20);
    expect(slots.at(-1)?.startsAt).toEqual(at('2026-10-24T15:15:00.000Z'));
    await expect(commands().materializeAvailability()).resolves.toMatchObject({
      created: 0,
    });
  });

  it('ends a Nutritionist’s blocks from today when a Branch assignment or Role changes (D15)', async () => {
    const carla = await world.principalOf('carla@example.com');
    const paola = await world.principalOf('paola.mendoza@example.com');
    const end = (branchId?: string) =>
      world.prisma.$transaction((transaction) =>
        endNutritionistAvailability(transaction, {
          staffMemberId:
            carla.identity.kind === 'staff' ? carla.identity.staffMemberId : '',
          branchId,
          actorAccountId: paola.accountId,
          now: clock,
        }),
      );

    await expect(end(branchIdOf('equipetrol'))).resolves.toEqual({
      endedBlocks: 1,
      withdrawnSlots: 20,
      keptEvaluations: 0,
    });
    // Lucía's September 28 Evaluation keeps its slot on the original block.
    await expect(end()).resolves.toEqual({
      endedBlocks: 1,
      withdrawnSlots: 4,
      keptEvaluations: 1,
    });
    await expect(end()).resolves.toEqual({
      endedBlocks: 0,
      withdrawnSlots: 0,
      keptEvaluations: 0,
    });
    await expect(commands().listAvailabilityBlocks(carla)).resolves.toEqual([]);
  });
});
