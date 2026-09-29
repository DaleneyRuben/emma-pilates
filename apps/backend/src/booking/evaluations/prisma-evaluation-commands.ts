import { createHash } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  EvaluationCancellationCause,
  EvaluationSlotState,
  EvaluationState,
  PrismaClient,
  StaffRole,
  SubscriptionState,
} from '../../generated/prisma/client';
import { retrySerializable } from '../../database/retry-serializable';
import {
  recordNotification as defaultNotificationRecorder,
  type NotificationRecorder,
} from '../../notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  addCivilDays,
  boliviaDate,
  boliviaInstant,
  boliviaMonth,
} from '../../time/bolivia-time';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { isSubscriptionEffective } from '../payments/purchase-eligibility';
import {
  EvaluationRuleError,
  type EvaluationRuleCode,
} from './evaluation-errors';
import { readEvaluationKinds } from './evaluation-kinds';
import { releaseSlot } from './evaluation-slot-release';
import {
  evaluationBookedNotice,
  evaluationCancelledByStudioNotice,
  evaluationCancelledNotice,
  evaluationReminderNotice,
} from './evaluation-notifications';
import {
  assertBlockValues,
  cancellableUntil,
  dueReminders,
  evaluationSlotMinutes,
  isEvaluationBookable,
  plannedSlots,
  resolveBlockChangeDate,
  slotsPerWeek,
  type BlockDefinition,
} from './evaluation-rules';
import { materializationHorizon } from '../materialization-horizon';

type Transaction = Prisma.TransactionClient;
type Database = PrismaClient | Transaction;

export type AvailabilityBlockValues = {
  branchId: string;
  weekday: number;
  startsAtLocal: string;
  endsAtLocal: string;
  effectiveFrom: Date;
};

export type AvailabilityBlockView = {
  id: string;
  branchId: string;
  branchName: string;
  weekday: number;
  startsAtLocal: string;
  endsAtLocal: string;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  slotsPerWeek: number;
  upcomingBookedCount: number;
};

export type AvailabilityBlockReplacement = {
  ended: AvailabilityBlockView;
  replacement: AvailabilityBlockView;
  withdrawnSlots: number;
  keptEvaluations: number;
};

export type AvailabilityBlockEnd = {
  block: AvailabilityBlockView;
  withdrawnSlots: number;
  keptEvaluations: number;
};

export type EvaluationSlotView = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  branchId: string;
  branchName: string;
  nutritionistName: string;
  bookable: boolean;
};

export type EvaluationMonthSummary = {
  month: Date;
  status: 'available' | 'used';
  evaluation: { id: string; startsAt: Date } | null;
};

export type BookableSlots = {
  days: { date: Date; slots: EvaluationSlotView[] }[];
  months: EvaluationMonthSummary[];
};

export type ClientEvaluationView = {
  id: string;
  slotId: string;
  state: 'booked' | 'cancelled';
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  branchId: string;
  branchName: string;
  nutritionistName: string;
  cancellableUntil: Date;
  cancellable: boolean;
};

export type NutritionistAgendaEntry = {
  evaluationId: string;
  clientName: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  branchId: string;
  branchName: string;
  kind: 'first' | 'follow_up';
};

export type Page<Item> = {
  items: Item[];
  hasMore: boolean;
  nextCursor: string | null;
};

export type EvaluationCommandsDependencies = {
  now: () => Date;
  recordNotification?: NotificationRecorder;
};

const serializable = { isolationLevel: 'Serializable' } as const;
const hourMilliseconds = 60 * 60 * 1_000;
// ADR-0060 replay window for lost responses, as for PAY-001.
const idempotencyRetentionMilliseconds = 48 * hourMilliseconds;
const defaultPageSize = 20;
const maxPageSize = 50;

const rule = (code: EvaluationRuleCode, message: string) =>
  new EvaluationRuleError(code, message);

const hashRequest = (request: unknown): Uint8Array<ArrayBuffer> =>
  new Uint8Array(createHash('sha256').update(JSON.stringify(request)).digest());

const parseClock = (value: string): number => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (match === null) {
    throw rule('availability_block_invalid_range', 'Times must be HH:MM');
  }
  return Number(match[1]) * 60 + Number(match[2]);
};

// time(0) columns travel as instants on 1970-01-01 in UTC.
const timeValue = (minutes: number): Date =>
  new Date(Date.UTC(1970, 0, 1, 0, minutes));
const minutesOf = (time: Date): number =>
  time.getUTCHours() * 60 + time.getUTCMinutes();
const clockText = (time: Date): string =>
  `${String(time.getUTCHours()).padStart(2, '0')}:${String(time.getUTCMinutes()).padStart(2, '0')}`;

const databaseCause = (error: unknown): string =>
  (
    error as {
      meta?: { driverAdapterError?: { cause?: { originalMessage?: string } } };
    }
  )?.meta?.driverAdapterError?.cause?.originalMessage ?? '';

const encodeCursor = (cursor: { startsAt: Date; id: string }): string =>
  Buffer.from(`${cursor.startsAt.toISOString()}|${cursor.id}`).toString(
    'base64url',
  );

export class InvalidEvaluationCursorError extends Error {}

const decodeCursor = (value: string): { startsAt: Date; id: string } => {
  const [startsAt, id] = Buffer.from(value, 'base64url')
    .toString('utf8')
    .split('|');
  const instant = new Date(startsAt ?? '');
  if (Number.isNaN(instant.getTime()) || !/^[0-9a-f-]{36}$/i.test(id ?? '')) {
    throw new InvalidEvaluationCursorError('Invalid Evaluation cursor');
  }
  return { startsAt: instant, id };
};

const pageSize = (limit: number | undefined): number =>
  Math.min(Math.max(limit ?? defaultPageSize, 1), maxPageSize);

const requireClient = (principal: AuthenticatedPrincipal): string => {
  if (principal.identity.kind !== 'client') {
    throw new BookingAccessDeniedError();
  }
  return principal.identity.clientId;
};

const requireNutritionist = (principal: AuthenticatedPrincipal): string => {
  if (
    principal.identity.kind !== 'staff' ||
    principal.identity.role !== 'nutritionist'
  ) {
    throw new BookingAccessDeniedError();
  }
  return principal.identity.staffMemberId;
};

const blockSelect = {
  id: true,
  nutritionistStaffMemberId: true,
  branchId: true,
  branch: { select: { name: true } },
  weekday: true,
  startsAtLocal: true,
  endsAtLocal: true,
  effectiveFrom: true,
  effectiveUntil: true,
} as const;

type BlockRow = Prisma.AvailabilityBlockGetPayload<{
  select: typeof blockSelect;
}>;

const definitionOf = (block: BlockRow): BlockDefinition => ({
  weekday: block.weekday,
  startMinutes: minutesOf(block.startsAtLocal),
  endMinutes: minutesOf(block.endsAtLocal),
  effectiveFrom: block.effectiveFrom,
  effectiveUntil: block.effectiveUntil,
});

const slotSelect = {
  id: true,
  startsAt: true,
  endsAt: true,
  state: true,
  localMonth: true,
  branchId: true,
  branch: { select: { name: true } },
  nutritionist: { select: { name: true } },
} as const;

const evaluationSelect = {
  id: true,
  state: true,
  evaluationSlotId: true,
  slot: { select: slotSelect },
} as const;

type EvaluationRow = Prisma.EvaluationGetPayload<{
  select: typeof evaluationSelect;
}>;

// Withdraws the block's future unbooked slots from the end date and counts
// the booked Evaluations that keep theirs (D6).
const endBlockFrom = async (
  transaction: Transaction,
  block: BlockRow,
  endsOn: Date,
  actorAccountId: string,
  now: Date,
): Promise<{ withdrawnSlots: number; keptEvaluations: number }> => {
  await transaction.availabilityBlock.update({
    where: { id: block.id },
    data: {
      effectiveUntil: endsOn,
      endedAt: now,
      endedByAccountId: actorAccountId,
    },
  });
  const affected = await transaction.$queryRaw<
    { id: string; booked: boolean }[]
  >`
    SELECT s.id,
           EXISTS (
             SELECT 1 FROM booking.evaluations e
             WHERE e.evaluation_slot_id = s.id AND e.state = 'booked'
           ) AS booked
    FROM booking.evaluation_slots s
    WHERE s.availability_block_id = ${block.id}::uuid
      AND s.state = 'published'
      AND s.starts_at >= ${boliviaInstant(endsOn, 0)}::timestamptz
      AND s.starts_at > ${now}::timestamptz
    ORDER BY s.starts_at, s.id
    FOR UPDATE OF s`;
  const unbooked = affected.filter((slot) => !slot.booked);
  if (unbooked.length > 0) {
    await transaction.evaluationSlot.updateMany({
      where: {
        id: { in: unbooked.map((slot) => slot.id) },
        state: EvaluationSlotState.PUBLISHED,
      },
      data: { state: EvaluationSlotState.WITHDRAWN, withdrawnAt: now },
    });
  }
  return {
    withdrawnSlots: unbooked.length,
    keptEvaluations: affected.length - unbooked.length,
  };
};

// D15 port: removing a Branch assignment (branchId) or changing the Role (no
// branchId) ends the Nutritionist's current and scheduled blocks from today in
// the caller's transaction. Booked Evaluations keep their slots.
export const endNutritionistAvailability = async (
  transaction: Transaction,
  input: {
    staffMemberId: string;
    branchId?: string;
    actorAccountId: string;
    now: Date;
  },
): Promise<{
  endedBlocks: number;
  withdrawnSlots: number;
  keptEvaluations: number;
}> => {
  const today = boliviaDate(input.now);
  const blocks = await transaction.$queryRaw<{ id: string }[]>`
    SELECT id FROM booking.availability_blocks
    WHERE nutritionist_staff_member_id = ${input.staffMemberId}::uuid
      AND (effective_until IS NULL
           OR effective_until > greatest(effective_from, ${today}::date))
    ORDER BY id
    FOR UPDATE`;
  const result = { endedBlocks: 0, withdrawnSlots: 0, keptEvaluations: 0 };

  for (const { id } of blocks) {
    const block = await transaction.availabilityBlock.findUniqueOrThrow({
      where: { id },
      select: blockSelect,
    });
    if (input.branchId !== undefined && block.branchId !== input.branchId) {
      continue;
    }
    const counts = await endBlockFrom(
      transaction,
      block,
      resolveBlockChangeDate({ block, selectedDate: today, today }),
      input.actorAccountId,
      input.now,
    );
    result.endedBlocks += 1;
    result.withdrawnSlots += counts.withdrawnSlots;
    result.keptEvaluations += counts.keptEvaluations;
  }

  return result;
};

export const createPrismaEvaluationCommands = (
  prisma: PrismaClient,
  dependencies: EvaluationCommandsDependencies,
) => {
  const recordNotification =
    dependencies.recordNotification ?? defaultNotificationRecorder;

  const transact = <Result>(
    work: (transaction: Transaction) => Promise<Result>,
  ): Promise<Result> =>
    retrySerializable(() => prisma.$transaction(work, serializable));

  const withIdempotency = async <Result extends Prisma.InputJsonObject>(
    transaction: Transaction,
    record: {
      accountId: string;
      command: string;
      idempotencyKey: string;
      request: unknown;
    },
    work: () => Promise<Result>,
  ): Promise<Result> => {
    const requestHash = hashRequest(record.request);
    const existing = await transaction.idempotencyRecord.findFirst({
      where: {
        accountId: record.accountId,
        command: record.command,
        idempotencyKey: record.idempotencyKey,
        deletedAt: null,
      },
      select: { requestHash: true, responseBody: true },
    });

    if (existing !== null) {
      if (!Buffer.from(existing.requestHash).equals(Buffer.from(requestHash))) {
        throw rule(
          'idempotency_key_reused',
          'Idempotency Key was reused with a different request',
        );
      }
      return existing.responseBody as Result;
    }

    const result = await work();
    const createdAt = dependencies.now();
    await transaction.idempotencyRecord.create({
      data: {
        accountId: record.accountId,
        command: record.command,
        idempotencyKey: record.idempotencyKey,
        requestHash,
        responseStatus: 201,
        responseBody: result,
        createdAt,
        expiresAt: new Date(
          createdAt.getTime() + idempotencyRetentionMilliseconds,
        ),
      },
    });
    return result;
  };

  const toBlockView = async (
    database: Database,
    block: BlockRow,
    now: Date,
  ): Promise<AvailabilityBlockView> => ({
    id: block.id,
    branchId: block.branchId,
    branchName: block.branch.name,
    weekday: block.weekday,
    startsAtLocal: clockText(block.startsAtLocal),
    endsAtLocal: clockText(block.endsAtLocal),
    effectiveFrom: block.effectiveFrom,
    effectiveUntil: block.effectiveUntil,
    slotsPerWeek: slotsPerWeek(definitionOf(block)),
    upcomingBookedCount: await database.evaluation.count({
      where: {
        state: EvaluationState.BOOKED,
        slot: { availabilityBlockId: block.id, endsAt: { gt: now } },
      },
    }),
  });

  const loadBlockView = async (
    database: Database,
    blockId: string,
    now: Date,
  ): Promise<AvailabilityBlockView> =>
    toBlockView(
      database,
      await database.availabilityBlock.findUniqueOrThrow({
        where: { id: blockId },
        select: blockSelect,
      }),
      now,
    );

  const assertAssignedBranch = async (
    transaction: Transaction,
    staffMemberId: string,
    branchId: string,
  ): Promise<void> => {
    const assignment = await transaction.staffBranchAssignment.findFirst({
      where: { staffMemberId, branchId, deletedAt: null },
      select: { branch: { select: { archivedAt: true } } },
    });
    if (assignment === null || assignment.branch.archivedAt !== null) {
      throw rule(
        'branch_not_assigned',
        'The Nutritionist is not assigned to this Branch',
      );
    }
  };

  const materializeBlock = async (
    transaction: Transaction,
    block: BlockRow,
    now: Date,
  ): Promise<{ created: number; skipped: number }> => {
    const planned = plannedSlots(definitionOf(block), {
      today: boliviaDate(now),
      now,
    });
    if (planned.length === 0) return { created: 0, skipped: 0 };

    // ON CONFLICT DO NOTHING without a target: the unique source/start index
    // makes reruns no-ops, and the published-slot exclusion skips a new slot
    // that overlaps one kept for a booked Evaluation.
    const { count } = await transaction.evaluationSlot.createMany({
      data: planned.map((slot) => ({
        availabilityBlockId: block.id,
        nutritionistStaffMemberId: block.nutritionistStaffMemberId,
        branchId: block.branchId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        localMonth: slot.localMonth,
        createdAt: now,
      })),
      skipDuplicates: true,
    });
    return { created: count, skipped: planned.length - count };
  };

  const insertBlock = async (
    transaction: Transaction,
    input: {
      nutritionistStaffMemberId: string;
      branchId: string;
      weekday: number;
      startMinutes: number;
      endMinutes: number;
      effectiveFrom: Date;
      effectiveUntil: Date | null;
      actorAccountId: string;
      now: Date;
    },
  ): Promise<BlockRow> => {
    try {
      return await transaction.availabilityBlock.create({
        data: {
          nutritionistStaffMemberId: input.nutritionistStaffMemberId,
          branchId: input.branchId,
          weekday: input.weekday,
          startsAtLocal: timeValue(input.startMinutes),
          endsAtLocal: timeValue(input.endMinutes),
          effectiveFrom: input.effectiveFrom,
          effectiveUntil: input.effectiveUntil,
          createdByAccountId: input.actorAccountId,
          // A replacement inherits an existing end, which keeps its evidence.
          endedAt: input.effectiveUntil === null ? null : input.now,
          endedByAccountId:
            input.effectiveUntil === null ? null : input.actorAccountId,
          createdAt: input.now,
        },
        select: blockSelect,
      });
    } catch (error) {
      if (
        databaseCause(error).includes(
          'availability_blocks_nutritionist_no_overlap',
        )
      ) {
        throw rule(
          'availability_block_overlap',
          'The Nutritionist already has availability at that time',
        );
      }
      throw error;
    }
  };

  const lockOwnBlock = async (
    transaction: Transaction,
    blockId: string,
    staffMemberId: string,
  ): Promise<BlockRow> => {
    const locked = await transaction.$queryRaw<{ id: string }[]>`
      SELECT id FROM booking.availability_blocks
      WHERE id = ${blockId}::uuid
      FOR UPDATE`;
    if (locked.length === 0) {
      throw rule(
        'availability_block_not_found',
        'Availability Block not found',
      );
    }
    const block = await transaction.availabilityBlock.findUniqueOrThrow({
      where: { id: blockId },
      select: blockSelect,
    });
    if (block.nutritionistStaffMemberId !== staffMemberId) {
      throw new BookingAccessDeniedError();
    }
    return block;
  };

  const blockValues = (input: AvailabilityBlockValues) => {
    const values = {
      weekday: input.weekday,
      startMinutes: parseClock(input.startsAtLocal),
      endMinutes: parseClock(input.endsAtLocal),
    };
    assertBlockValues(values);
    return values;
  };

  const createAvailabilityBlock = async (
    input: AvailabilityBlockValues,
    principal: AuthenticatedPrincipal,
    idempotencyKey: string,
  ): Promise<AvailabilityBlockView> => {
    const staffMemberId = requireNutritionist(principal);
    const values = blockValues(input);
    const now = dependencies.now();

    return transact(async (transaction) => {
      const { blockId } = await withIdempotency(
        transaction,
        {
          accountId: principal.accountId,
          command: 'create_availability_block',
          idempotencyKey,
          request: input,
        },
        async () => {
          if (input.effectiveFrom < boliviaDate(now)) {
            throw rule(
              'availability_block_effective_date_past',
              'The block must take effect today or later',
            );
          }
          await assertAssignedBranch(
            transaction,
            staffMemberId,
            input.branchId,
          );
          const block = await insertBlock(transaction, {
            nutritionistStaffMemberId: staffMemberId,
            branchId: input.branchId,
            ...values,
            effectiveFrom: input.effectiveFrom,
            effectiveUntil: null,
            actorAccountId: principal.accountId,
            now,
          });
          await materializeBlock(transaction, block, now);
          return { blockId: block.id };
        },
      );
      return loadBlockView(transaction, blockId, now);
    });
  };

  const replaceAvailabilityBlock = async (
    input: AvailabilityBlockValues & { blockId: string },
    principal: AuthenticatedPrincipal,
    idempotencyKey: string,
  ): Promise<AvailabilityBlockReplacement> => {
    const staffMemberId = requireNutritionist(principal);
    const values = blockValues(input);
    const now = dependencies.now();

    return transact(async (transaction) => {
      const outcome = await withIdempotency(
        transaction,
        {
          accountId: principal.accountId,
          command: 'replace_availability_block',
          idempotencyKey,
          request: input,
        },
        async () => {
          const block = await lockOwnBlock(
            transaction,
            input.blockId,
            staffMemberId,
          );
          await assertAssignedBranch(
            transaction,
            staffMemberId,
            input.branchId,
          );
          const endsOn = resolveBlockChangeDate({
            block,
            selectedDate: input.effectiveFrom,
            today: boliviaDate(now),
          });
          const counts = await endBlockFrom(
            transaction,
            block,
            endsOn,
            principal.accountId,
            now,
          );
          const replacement = await insertBlock(transaction, {
            nutritionistStaffMemberId: staffMemberId,
            branchId: input.branchId,
            ...values,
            effectiveFrom: endsOn,
            effectiveUntil: block.effectiveUntil,
            actorAccountId: principal.accountId,
            now,
          });
          await materializeBlock(transaction, replacement, now);
          return {
            endedBlockId: block.id,
            replacementBlockId: replacement.id,
            ...counts,
          };
        },
      );
      return {
        ended: await loadBlockView(transaction, outcome.endedBlockId, now),
        replacement: await loadBlockView(
          transaction,
          outcome.replacementBlockId,
          now,
        ),
        withdrawnSlots: outcome.withdrawnSlots,
        keptEvaluations: outcome.keptEvaluations,
      };
    });
  };

  const endAvailabilityBlock = async (
    input: { blockId: string; effectiveFrom: Date },
    principal: AuthenticatedPrincipal,
  ): Promise<AvailabilityBlockEnd> => {
    const staffMemberId = requireNutritionist(principal);
    const now = dependencies.now();

    return transact(async (transaction) => {
      const block = await lockOwnBlock(
        transaction,
        input.blockId,
        staffMemberId,
      );
      const target =
        input.effectiveFrom > block.effectiveFrom
          ? input.effectiveFrom
          : block.effectiveFrom;

      // An equivalent retry against an already-ended block returns its state.
      if (
        block.effectiveUntil !== null &&
        block.effectiveUntil.getTime() === target.getTime()
      ) {
        const kept = await transaction.evaluation.count({
          where: {
            state: EvaluationState.BOOKED,
            slot: {
              availabilityBlockId: block.id,
              startsAt: { gte: boliviaInstant(target, 0), gt: now },
            },
          },
        });
        return {
          block: await toBlockView(transaction, block, now),
          withdrawnSlots: 0,
          keptEvaluations: kept,
        };
      }

      const endsOn = resolveBlockChangeDate({
        block,
        selectedDate: input.effectiveFrom,
        today: boliviaDate(now),
      });
      const counts = await endBlockFrom(
        transaction,
        block,
        endsOn,
        principal.accountId,
        now,
      );
      return {
        block: await loadBlockView(transaction, block.id, now),
        ...counts,
      };
    });
  };

  const listAvailabilityBlocks = async (
    principal: AuthenticatedPrincipal,
  ): Promise<AvailabilityBlockView[]> => {
    const staffMemberId = requireNutritionist(principal);
    const now = dependencies.now();
    const today = boliviaDate(now);
    const blocks = await prisma.availabilityBlock.findMany({
      where: {
        nutritionistStaffMemberId: staffMemberId,
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: today } }],
      },
      orderBy: [
        { weekday: 'asc' },
        { startsAtLocal: 'asc' },
        { effectiveFrom: 'asc' },
      ],
      select: blockSelect,
    });

    return Promise.all(
      blocks
        // A block ended before it began has an empty range and never publishes.
        .filter(
          (block) =>
            block.effectiveUntil === null ||
            block.effectiveUntil > block.effectiveFrom,
        )
        .map((block) => toBlockView(prisma, block, now)),
    );
  };

  // Hourly reconciler (ADR-0058/0059): extends every intersecting block to the
  // current horizon in its own short transaction. It never withdraws.
  const materializeAvailability = async (): Promise<{
    blocks: number;
    created: number;
    skipped: number;
  }> => {
    const now = dependencies.now();
    const today = boliviaDate(now);
    const horizon = materializationHorizon(today);
    const blocks = await prisma.availabilityBlock.findMany({
      where: {
        effectiveFrom: { lte: horizon.through },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: today } }],
      },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    let created = 0;
    let skipped = 0;

    for (const { id } of blocks) {
      const result = await transact(async (transaction) =>
        materializeBlock(
          transaction,
          await transaction.availabilityBlock.findUniqueOrThrow({
            where: { id },
            select: blockSelect,
          }),
          now,
        ),
      );
      created += result.created;
      skipped += result.skipped;
    }

    return { blocks: blocks.length, created, skipped };
  };

  const toSlotView = (
    slot: Prisma.EvaluationSlotGetPayload<{ select: typeof slotSelect }>,
    bookable: boolean,
  ): EvaluationSlotView => ({
    id: slot.id,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    durationMinutes: evaluationSlotMinutes,
    branchId: slot.branchId,
    branchName: slot.branch.name,
    nutritionistName: slot.nutritionist.name,
    bookable,
  });

  const toClientEvaluationView = (
    row: EvaluationRow,
    now: Date,
  ): ClientEvaluationView => ({
    id: row.id,
    slotId: row.evaluationSlotId,
    state: row.state === EvaluationState.BOOKED ? 'booked' : 'cancelled',
    startsAt: row.slot.startsAt,
    endsAt: row.slot.endsAt,
    durationMinutes: evaluationSlotMinutes,
    branchId: row.slot.branchId,
    branchName: row.slot.branch.name,
    nutritionistName: row.slot.nutritionist.name,
    cancellableUntil: cancellableUntil(row.slot.startsAt),
    cancellable:
      row.state === EvaluationState.BOOKED &&
      isEvaluationBookable(row.slot.startsAt, now),
  });

  const usedMonths = (database: Database, clientId: string, months: Date[]) =>
    database.evaluation.findMany({
      where: {
        clientId,
        state: EvaluationState.BOOKED,
        eligibilityMonth: { in: months },
      },
      select: {
        id: true,
        eligibilityMonth: true,
        slot: { select: { startsAt: true } },
      },
    });

  const monthsBetween = (from: Date, through: Date): Date[] => {
    const months: Date[] = [];
    for (
      let month = boliviaMonth(boliviaInstant(from, 12 * 60));
      month <= through;
      month = new Date(
        Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1),
      )
    ) {
      months.push(month);
    }
    return months;
  };

  const listBookableSlots = async (
    query: { from?: Date; to?: Date; branchId?: string },
    principal: AuthenticatedPrincipal,
  ): Promise<BookableSlots> => {
    const clientId = requireClient(principal);
    const now = dependencies.now();
    const horizon = materializationHorizon(boliviaDate(now));
    const from =
      query.from !== undefined && query.from > horizon.from
        ? query.from
        : horizon.from;
    const through =
      query.to !== undefined && query.to < horizon.through
        ? query.to
        : horizon.through;
    const months = monthsBetween(from, through);
    const used = await usedMonths(prisma, clientId, months);
    const usedKeys = new Set(used.map((row) => row.eligibilityMonth.getTime()));

    const slots =
      from > through
        ? []
        : await prisma.evaluationSlot.findMany({
            where: {
              state: EvaluationSlotState.PUBLISHED,
              startsAt: {
                gte: boliviaInstant(from, 0),
                lt: boliviaInstant(addCivilDays(through, 1), 0),
                gt: new Date(now.getTime() + 3 * hourMilliseconds),
              },
              localMonth: { notIn: used.map((row) => row.eligibilityMonth) },
              evaluations: { none: { state: EvaluationState.BOOKED } },
              branch: { archivedAt: null },
              ...(query.branchId === undefined
                ? {}
                : { branchId: query.branchId }),
            },
            orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
            select: slotSelect,
          });

    const days = new Map<number, BookableSlots['days'][number]>();
    for (const slot of slots) {
      if (!isEvaluationBookable(slot.startsAt, now)) continue;
      const date = boliviaDate(slot.startsAt);
      const day = days.get(date.getTime()) ?? { date, slots: [] };
      day.slots.push(toSlotView(slot, true));
      days.set(date.getTime(), day);
    }

    return {
      days: [...days.values()],
      months: months.map((month) => {
        const evaluation = used.find(
          (row) => row.eligibilityMonth.getTime() === month.getTime(),
        );
        return usedKeys.has(month.getTime()) && evaluation !== undefined
          ? {
              month,
              status: 'used',
              evaluation: {
                id: evaluation.id,
                startsAt: evaluation.slot.startsAt,
              },
            }
          : { month, status: 'available', evaluation: null };
      }),
    };
  };

  const readEvaluationSlot = async (
    slotId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<EvaluationSlotView> => {
    const clientId = requireClient(principal);
    const now = dependencies.now();
    const slot = await prisma.evaluationSlot.findUnique({
      where: { id: slotId },
      select: {
        ...slotSelect,
        _count: {
          select: { evaluations: { where: { state: EvaluationState.BOOKED } } },
        },
      },
    });
    if (slot === null) {
      throw rule('evaluation_slot_not_found', 'Evaluation slot not found');
    }
    const monthUsed =
      (await usedMonths(prisma, clientId, [slot.localMonth])).length > 0;

    return toSlotView(
      slot,
      slot.state === EvaluationSlotState.PUBLISHED &&
        slot._count.evaluations === 0 &&
        isEvaluationBookable(slot.startsAt, now) &&
        !monthUsed,
    );
  };

  const lockClient = (transaction: Transaction, clientId: string) =>
    transaction.$queryRaw`
      SELECT id FROM booking.clients WHERE id = ${clientId}::uuid FOR UPDATE`;

  const lockSlot = async (transaction: Transaction, slotId: string) => {
    const rows = await transaction.$queryRaw<{ id: string }[]>`
      SELECT id FROM booking.evaluation_slots WHERE id = ${slotId}::uuid FOR UPDATE`;
    return rows.length > 0;
  };

  const bookEvaluation = async (
    slotId: string,
    principal: AuthenticatedPrincipal,
    idempotencyKey: string,
  ): Promise<ClientEvaluationView> => {
    const clientId = requireClient(principal);
    const now = dependencies.now();

    return transact(async (transaction) => {
      const { evaluationId } = await withIdempotency(
        transaction,
        {
          accountId: principal.accountId,
          command: 'book_evaluation',
          idempotencyKey,
          request: { slotId },
        },
        async () => {
          await lockClient(transaction, clientId);
          if (!(await lockSlot(transaction, slotId))) {
            throw rule(
              'evaluation_slot_not_found',
              'Evaluation slot not found',
            );
          }
          const slot = await transaction.evaluationSlot.findUniqueOrThrow({
            where: { id: slotId },
            select: {
              id: true,
              startsAt: true,
              localMonth: true,
              state: true,
              nutritionist: {
                select: { account: { select: { id: true } } },
              },
              _count: {
                select: {
                  evaluations: { where: { state: EvaluationState.BOOKED } },
                },
              },
            },
          });
          if (
            slot.state !== EvaluationSlotState.PUBLISHED ||
            slot._count.evaluations > 0 ||
            slot.startsAt <= now
          ) {
            throw rule(
              'evaluation_slot_unavailable',
              'The Evaluation slot is no longer available',
            );
          }
          if (!isEvaluationBookable(slot.startsAt, now)) {
            throw rule(
              'evaluation_booking_closed',
              'Evaluations close 3 hours before they start',
            );
          }

          const slotDate = boliviaDate(slot.startsAt);
          const today = boliviaDate(now);
          const candidates = await transaction.subscription.findMany({
            where: {
              clientId,
              state: SubscriptionState.ACTIVE,
              startsOn: { lte: slotDate },
              endsOn: { gte: slotDate },
            },
            orderBy: [{ endsOn: 'desc' }, { id: 'asc' }],
            select: {
              id: true,
              endsOn: true,
              remainingClassAllowance: true,
              _count: {
                select: {
                  bookings: {
                    where: {
                      state: 'BOOKED',
                      session: { startsAt: { gt: now } },
                    },
                  },
                },
              },
            },
          });
          const subscription = candidates.find((candidate) =>
            isSubscriptionEffective(
              {
                endsOn: candidate.endsOn,
                remainingClassAllowance: candidate.remainingClassAllowance,
                futureBookedCount: candidate._count.bookings,
              },
              today,
            ),
          );
          if (subscription === undefined) {
            throw rule(
              'no_eligible_subscription',
              'An active Subscription covering the Evaluation date is required',
            );
          }
          if (
            (await usedMonths(transaction, clientId, [slot.localMonth]))
              .length > 0
          ) {
            throw rule(
              'evaluation_month_used',
              'The Evaluation for that month is already booked',
            );
          }

          let created: { id: string; client: { name: string } };
          try {
            created = await transaction.evaluation.create({
              data: {
                clientId,
                evaluationSlotId: slot.id,
                eligibilityMonth: slot.localMonth,
                subscriptionId: subscription.id,
                createdByAccountId: principal.accountId,
                createdAt: now,
              },
              select: { id: true, client: { select: { name: true } } },
            });
          } catch (error) {
            const cause = databaseCause(error);
            if (cause.includes('evaluations_one_booked_per_client_month_key')) {
              throw rule(
                'evaluation_month_used',
                'The Evaluation for that month is already booked',
              );
            }
            if (
              cause.includes('evaluations_one_booked_per_slot_key') ||
              cause.includes('evaluation slot is not published')
            ) {
              throw rule(
                'evaluation_slot_unavailable',
                'The Evaluation slot is no longer available',
              );
            }
            throw error;
          }

          if (slot.nutritionist.account !== null) {
            await recordNotification(
              transaction,
              evaluationBookedNotice({
                accountId: slot.nutritionist.account.id,
                evaluationId: created.id,
                clientName: created.client.name,
                startsAt: slot.startsAt,
                occurredAt: now,
              }),
            );
          }
          return { evaluationId: created.id };
        },
      );

      return toClientEvaluationView(
        await transaction.evaluation.findUniqueOrThrow({
          where: { id: evaluationId },
          select: evaluationSelect,
        }),
        now,
      );
    });
  };

  const pageOf = <Item>(
    rows: Item[],
    limit: number,
    cursorOf: (item: Item) => { startsAt: Date; id: string },
  ): Page<Item> => {
    const items = rows.slice(0, limit);
    const hasMore = rows.length > limit;
    const last = items.at(-1);
    return {
      items,
      hasMore,
      nextCursor:
        hasMore && last !== undefined ? encodeCursor(cursorOf(last)) : null,
    };
  };

  const listClientEvaluations = async (
    query: { scope: 'upcoming' | 'past'; cursor?: string; limit?: number },
    principal: AuthenticatedPrincipal,
  ): Promise<Page<ClientEvaluationView>> => {
    const clientId = requireClient(principal);
    const now = dependencies.now();
    const limit = pageSize(query.limit);
    const after =
      query.cursor === undefined ? null : decodeCursor(query.cursor);
    const upcoming = query.scope === 'upcoming';
    const direction = upcoming ? 'asc' : 'desc';
    const beyond = upcoming ? 'gt' : 'lt';

    const rows = await prisma.evaluation.findMany({
      where: {
        clientId,
        state: EvaluationState.BOOKED,
        slot: { endsAt: upcoming ? { gt: now } : { lte: now } },
        ...(after === null
          ? {}
          : {
              OR: [
                { slot: { startsAt: { [beyond]: after.startsAt } } },
                {
                  slot: { startsAt: after.startsAt },
                  id: { [beyond]: after.id },
                },
              ],
            }),
      },
      orderBy: [{ slot: { startsAt: direction } }, { id: direction }],
      take: limit + 1,
      select: evaluationSelect,
    });

    return pageOf(
      rows.map((row) => toClientEvaluationView(row, now)),
      limit,
      (item) => ({ startsAt: item.startsAt, id: item.id }),
    );
  };

  // Kept slots of an ended block are withdrawn once their Evaluation is
  // cancelled, so the replacement block can publish that time instead.
  const cancellationTarget = {
    id: true,
    clientId: true,
    state: true,
    evaluationSlotId: true,
    client: {
      select: { name: true, account: { select: { id: true } } },
    },
    slot: {
      select: {
        startsAt: true,
        branchId: true,
        nutritionistStaffMemberId: true,
        nutritionist: { select: { account: { select: { id: true } } } },
      },
    },
  } as const;

  const lockEvaluation = async (
    transaction: Transaction,
    evaluation: { id: string; clientId: string; evaluationSlotId: string },
  ) => {
    await lockClient(transaction, evaluation.clientId);
    await lockSlot(transaction, evaluation.evaluationSlotId);
    await transaction.$queryRaw`
      SELECT id FROM booking.evaluations WHERE id = ${evaluation.id}::uuid FOR UPDATE`;
    return transaction.evaluation.findUniqueOrThrow({
      where: { id: evaluation.id },
      select: cancellationTarget,
    });
  };

  const cancelClientEvaluation = async (
    evaluationId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<void> => {
    const clientId = requireClient(principal);
    const now = dependencies.now();

    await transact(async (transaction) => {
      const found = await transaction.evaluation.findUnique({
        where: { id: evaluationId },
        select: { id: true, clientId: true, evaluationSlotId: true },
      });
      if (found === null) {
        throw rule('evaluation_not_found', 'Evaluation not found');
      }
      if (found.clientId !== clientId) throw new BookingAccessDeniedError();

      const evaluation = await lockEvaluation(transaction, found);
      if (evaluation.state === EvaluationState.CANCELLED) return;
      if (!isEvaluationBookable(evaluation.slot.startsAt, now)) {
        throw rule(
          'evaluation_cancellation_window_closed',
          'Evaluations can no longer be cancelled within 3 hours of the start',
        );
      }

      await transaction.evaluation.update({
        where: { id: evaluation.id },
        data: {
          state: EvaluationState.CANCELLED,
          cancelledAt: now,
          cancelledByAccountId: principal.accountId,
          cancellationCause: EvaluationCancellationCause.CLIENT_REQUEST,
        },
      });
      await releaseSlot(transaction, evaluation.evaluationSlotId, now);
      if (evaluation.slot.nutritionist.account !== null) {
        await recordNotification(
          transaction,
          evaluationCancelledNotice({
            accountId: evaluation.slot.nutritionist.account.id,
            evaluationId: evaluation.id,
            clientName: evaluation.client.name,
            startsAt: evaluation.slot.startsAt,
            occurredAt: now,
          }),
        );
      }
    });
  };

  const cancelEvaluationAsStaff = async (
    evaluationId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<void> => {
    const identity = principal.identity;
    if (
      identity.kind !== 'staff' ||
      (identity.role !== 'nutritionist' && identity.role !== 'administrator')
    ) {
      throw new BookingAccessDeniedError();
    }
    const now = dependencies.now();

    await transact(async (transaction) => {
      const found = await transaction.evaluation.findUnique({
        where: { id: evaluationId },
        select: {
          id: true,
          clientId: true,
          evaluationSlotId: true,
          slot: { select: { nutritionistStaffMemberId: true } },
        },
      });
      if (found === null) {
        throw rule('evaluation_not_found', 'Evaluation not found');
      }
      if (
        identity.role === 'nutritionist' &&
        found.slot.nutritionistStaffMemberId !== identity.staffMemberId
      ) {
        throw new BookingAccessDeniedError();
      }

      const evaluation = await lockEvaluation(transaction, found);
      if (evaluation.state === EvaluationState.CANCELLED) return;
      if (now >= evaluation.slot.startsAt) {
        throw rule('evaluation_started', 'The Evaluation has already started');
      }

      await transaction.evaluation.update({
        where: { id: evaluation.id },
        data: {
          state: EvaluationState.CANCELLED,
          cancelledAt: now,
          cancelledByAccountId: principal.accountId,
          cancellationCause: EvaluationCancellationCause.STAFF_CANCELLED,
        },
      });
      await releaseSlot(transaction, evaluation.evaluationSlotId, now);
      if (evaluation.client.account !== null) {
        await recordNotification(
          transaction,
          evaluationCancelledByStudioNotice({
            accountId: evaluation.client.account.id,
            evaluationId: evaluation.id,
            startsAt: evaluation.slot.startsAt,
            occurredAt: now,
          }),
        );
      }
      await transaction.auditRecord.create({
        data: {
          actionCode: 'evaluation.cancelled_by_staff',
          outcome: AuditOutcome.SUCCEEDED,
          actorKind: AuditActorKind.ACCOUNT,
          actorAccountId: principal.accountId,
          actorRole: identity.role.toUpperCase() as StaffRole,
          targetType: 'evaluation',
          targetId: evaluation.id,
          branchId: evaluation.slot.branchId,
          correlationId: evaluation.id,
          occurredAt: now,
          metadata: {
            cause: 'staff_cancelled',
            insideClientWindow: !isEvaluationBookable(
              evaluation.slot.startsAt,
              now,
            ),
          },
        },
      });
    });
  };

  const listNutritionistAgenda = async (
    query: { from?: Date; cursor?: string; limit?: number },
    principal: AuthenticatedPrincipal,
  ): Promise<Page<NutritionistAgendaEntry>> => {
    const staffMemberId = requireNutritionist(principal);
    const now = dependencies.now();
    const limit = pageSize(query.limit);
    const after =
      query.cursor === undefined ? null : decodeCursor(query.cursor);

    const rows = await prisma.evaluation.findMany({
      where: {
        state: EvaluationState.BOOKED,
        slot: {
          nutritionistStaffMemberId: staffMemberId,
          endsAt: { gt: now },
          ...(query.from === undefined
            ? {}
            : { startsAt: { gte: boliviaInstant(query.from, 0) } }),
        },
        ...(after === null
          ? {}
          : {
              OR: [
                { slot: { startsAt: { gt: after.startsAt } } },
                { slot: { startsAt: after.startsAt }, id: { gt: after.id } },
              ],
            }),
      },
      orderBy: [{ slot: { startsAt: 'asc' } }, { id: 'asc' }],
      take: limit + 1,
      select: {
        id: true,
        clientId: true,
        client: { select: { name: true } },
        slot: { select: slotSelect },
      },
    });

    const kindOf = await readEvaluationKinds(
      prisma,
      rows.map((row) => row.clientId),
    );

    return pageOf(
      rows.map((row) => ({
        evaluationId: row.id,
        clientName: row.client.name,
        startsAt: row.slot.startsAt,
        endsAt: row.slot.endsAt,
        durationMinutes: evaluationSlotMinutes,
        branchId: row.slot.branchId,
        branchName: row.slot.branch.name,
        kind: kindOf(row.clientId, row.slot.startsAt),
      })),
      limit,
      (item) => ({ startsAt: item.startsAt, id: item.evaluationId }),
    );
  };

  // Reminder sweep (ADR-0058, D18): each due reminder and its marker are
  // recorded in one transaction; markers make reruns no-ops.
  const sendDueEvaluationReminders = async (): Promise<{ sent: number }> => {
    const now = dependencies.now();
    const candidates = await prisma.evaluation.findMany({
      where: {
        state: EvaluationState.BOOKED,
        hourReminderRecordedAt: null,
        slot: {
          startsAt: {
            gt: now,
            lte: new Date(now.getTime() + 24 * hourMilliseconds),
          },
        },
      },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    let sent = 0;

    for (const { id } of candidates) {
      sent += await transact(async (transaction) => {
        await transaction.$queryRaw`
          SELECT id FROM booking.evaluations WHERE id = ${id}::uuid FOR UPDATE`;
        const evaluation = await transaction.evaluation.findUniqueOrThrow({
          where: { id },
          select: {
            id: true,
            state: true,
            createdAt: true,
            dayReminderRecordedAt: true,
            hourReminderRecordedAt: true,
            client: { select: { account: { select: { id: true } } } },
            slot: { select: { startsAt: true } },
          },
        });
        if (evaluation.state !== EvaluationState.BOOKED) return 0;
        const [kind] = dueReminders(
          {
            createdAt: evaluation.createdAt,
            startsAt: evaluation.slot.startsAt,
            dayReminderRecordedAt: evaluation.dayReminderRecordedAt,
            hourReminderRecordedAt: evaluation.hourReminderRecordedAt,
          },
          now,
        );
        if (kind === undefined) return 0;

        // A Client without an Account receives nothing; the marker still
        // settles the reminder.
        if (evaluation.client.account !== null) {
          await recordNotification(
            transaction,
            evaluationReminderNotice({
              accountId: evaluation.client.account.id,
              evaluationId: evaluation.id,
              kind,
              startsAt: evaluation.slot.startsAt,
              occurredAt: now,
            }),
          );
        }
        await transaction.evaluation.update({
          where: { id },
          data:
            kind === 'day'
              ? { dayReminderRecordedAt: now }
              : { hourReminderRecordedAt: now },
        });
        return evaluation.client.account === null ? 0 : 1;
      });
    }

    return { sent };
  };

  return {
    createAvailabilityBlock,
    replaceAvailabilityBlock,
    endAvailabilityBlock,
    listAvailabilityBlocks,
    materializeAvailability,
    listBookableSlots,
    readEvaluationSlot,
    bookEvaluation,
    listClientEvaluations,
    cancelClientEvaluation,
    cancelEvaluationAsStaff,
    listNutritionistAgenda,
    sendDueEvaluationReminders,
  };
};

export type EvaluationCommands = ReturnType<
  typeof createPrismaEvaluationCommands
>;
