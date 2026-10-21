import { retrySerializable } from '../../database/retry-serializable';
import { SessionState } from '../../generated/prisma/enums';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import { endNutritionistAvailability } from '../evaluations/prisma-evaluation-commands';
import {
  changedValues,
  recordAdministratorAudit,
} from './administration-audit';
import {
  AdministrationError,
  databaseCause,
  requireAdministrator,
  type AdministratorActor,
} from './administration-errors';

type Transaction = Prisma.TransactionClient;

export type BranchInput = { name: string; address: string };
export type ClassTypeInput = {
  name: string;
  description: string;
  defaultCapacity: number;
  equipmentNeeds: string | null;
};
export type PlanInput = {
  name: string;
  durationMonths: number;
  classAllowance: number;
  priceCentavos: number;
  displayOrder: number;
};

const planDurations = new Set([1, 3, 6, 12]);
const serializable = { isolationLevel: 'Serializable' } as const;

const branchSelect = {
  id: true,
  name: true,
  address: true,
  archivedAt: true,
} satisfies Prisma.BranchSelect;
const classTypeSelect = {
  id: true,
  name: true,
  description: true,
  defaultCapacity: true,
  equipmentNeeds: true,
  archivedAt: true,
} satisfies Prisma.ClassTypeSelect;
const planSelect = {
  id: true,
  name: true,
  durationMonths: true,
  classAllowance: true,
  priceCentavos: true,
  displayOrder: true,
  hiddenAt: true,
} satisfies Prisma.PlanSelect;

const trimmed = <Input extends Record<string, unknown>>(input: Input): Input =>
  Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === 'string' ? value.trim() : value,
    ]),
  ) as Input;

// Database checks guard every catalog value; their violations map to one code.
const translate = (error: unknown): never => {
  const cause = databaseCause(error);
  if (cause.includes('class_types_active_normalized_name_key')) {
    throw new AdministrationError('class_type_name_taken');
  }
  if (cause.includes('violates check constraint') || cause.includes('23514')) {
    throw new AdministrationError('invalid_catalog_value');
  }
  throw error;
};

// ADM-001 slice A: Branch, Class Type, and Plan management for the admin web.
export const createPrismaCatalogAdministration = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => {
  const transact = <Result>(
    work: (transaction: Transaction) => Promise<Result>,
  ): Promise<Result> =>
    retrySerializable(() => prisma.$transaction(work, serializable)).catch(
      translate,
    );

  const effectiveToday = () => boliviaDate(dependencies.now());

  const audit = (
    transaction: Transaction,
    actor: AdministratorActor,
    record: {
      actionCode: string;
      targetType: 'branch' | 'class_type' | 'plan';
      targetId: string;
      branchId?: string;
      metadata?: Prisma.InputJsonObject;
    },
  ) =>
    recordAdministratorAudit(transaction, actor, {
      ...record,
      metadata: record.metadata ?? {},
      occurredAt: dependencies.now(),
    });

  const requirePlanValues = (input: PlanInput) => {
    if (
      !planDurations.has(input.durationMonths) ||
      input.name.trim() === '' ||
      input.classAllowance < 1 ||
      input.priceCentavos < 1
    ) {
      throw new AdministrationError('invalid_catalog_value');
    }
  };

  return {
    createBranch: async (
      input: BranchInput,
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireAdministrator(principal);
      const values = trimmed(input);
      return transact(async (transaction) => {
        const branch = await transaction.branch.create({
          data: values,
          select: branchSelect,
        });
        await audit(transaction, actor, {
          actionCode: 'branch.created',
          targetType: 'branch',
          targetId: branch.id,
          branchId: branch.id,
          metadata: { name: branch.name },
        });
        return branch;
      });
    },

    updateBranch: async (
      input: BranchInput & { branchId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireAdministrator(principal);
      const { branchId, ...values } = trimmed(input);
      return transact(async (transaction) => {
        const previous = await transaction.branch.findUnique({
          where: { id: branchId },
          select: branchSelect,
        });
        if (previous === null)
          throw new AdministrationError('branch_not_found');
        const branch = await transaction.branch.update({
          where: { id: branchId },
          data: values,
          select: branchSelect,
        });
        await audit(transaction, actor, {
          actionCode: 'branch.updated',
          targetType: 'branch',
          targetId: branchId,
          branchId,
          metadata: changedValues(previous, branch, ['name', 'address']),
        });
        return branch;
      });
    },

    // A Branch with upcoming Sessions or effective schedules stays; an idle
    // one is archived and its Nutritionists' blocks end there (NUT-001 D15).
    archiveBranch: async (
      input: { branchId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireAdministrator(principal);
      const now = dependencies.now();
      return transact(async (transaction) => {
        const branch = await transaction.branch.findUnique({
          where: { id: input.branchId },
          select: branchSelect,
        });
        if (branch === null) throw new AdministrationError('branch_not_found');
        if (branch.archivedAt !== null) return branch;
        const [sessions, schedules] = await Promise.all([
          transaction.session.count({
            where: {
              branchId: branch.id,
              state: SessionState.SCHEDULED,
              startsAt: { gt: now },
            },
          }),
          transaction.sessionSchedule.count({
            where: {
              branchId: branch.id,
              OR: [
                { effectiveUntil: null },
                { effectiveUntil: { gt: effectiveToday() } },
              ],
            },
          }),
        ]);
        if (sessions + schedules > 0) {
          throw new AdministrationError('branch_in_use');
        }
        const nutritionists = await transaction.availabilityBlock.findMany({
          where: { branchId: branch.id },
          distinct: ['nutritionistStaffMemberId'],
          select: { nutritionistStaffMemberId: true },
        });
        let endedAvailabilityBlocks = 0;
        for (const { nutritionistStaffMemberId } of nutritionists) {
          const ended = await endNutritionistAvailability(transaction, {
            staffMemberId: nutritionistStaffMemberId,
            branchId: branch.id,
            actorAccountId: actor.accountId,
            now,
          });
          endedAvailabilityBlocks += ended.endedBlocks;
        }
        const archived = await transaction.branch.update({
          where: { id: branch.id },
          data: { archivedAt: now },
          select: branchSelect,
        });
        await audit(transaction, actor, {
          actionCode: 'branch.archived',
          targetType: 'branch',
          targetId: branch.id,
          branchId: branch.id,
          metadata: { endedAvailabilityBlocks },
        });
        return archived;
      });
    },

    createClassType: async (
      input: ClassTypeInput,
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireAdministrator(principal);
      const values = trimmed(input);
      return transact(async (transaction) => {
        const classType = await transaction.classType.create({
          data: values,
          select: classTypeSelect,
        });
        await audit(transaction, actor, {
          actionCode: 'class_type.created',
          targetType: 'class_type',
          targetId: classType.id,
          metadata: { defaultCapacity: classType.defaultCapacity },
        });
        return classType;
      });
    },

    // Existing Sessions keep their facts (follow-up 39 §2); a Class Type has
    // no duration (booking ADR-0004).
    updateClassType: async (
      input: ClassTypeInput & { classTypeId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireAdministrator(principal);
      const { classTypeId, ...values } = trimmed(input);
      return transact(async (transaction) => {
        const previous = await transaction.classType.findUnique({
          where: { id: classTypeId },
          select: classTypeSelect,
        });
        if (previous === null) {
          throw new AdministrationError('class_type_not_found');
        }
        const classType = await transaction.classType.update({
          where: { id: classTypeId },
          data: values,
          select: classTypeSelect,
        });
        await audit(transaction, actor, {
          actionCode: 'class_type.updated',
          targetType: 'class_type',
          targetId: classTypeId,
          metadata: {
            ...changedValues(previous, classType, ['name', 'defaultCapacity']),
            descriptionChanged: previous.description !== classType.description,
            equipmentNeedsChanged:
              previous.equipmentNeeds !== classType.equipmentNeeds,
          },
        });
        return classType;
      });
    },

    archiveClassType: async (
      input: { classTypeId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireAdministrator(principal);
      return transact(async (transaction) => {
        const classType = await transaction.classType.findUnique({
          where: { id: input.classTypeId },
          select: classTypeSelect,
        });
        if (classType === null) {
          throw new AdministrationError('class_type_not_found');
        }
        if (classType.archivedAt !== null) return classType;
        const schedules = await transaction.sessionSchedule.count({
          where: {
            classTypeId: classType.id,
            OR: [
              { effectiveUntil: null },
              { effectiveUntil: { gt: effectiveToday() } },
            ],
          },
        });
        if (schedules > 0) throw new AdministrationError('class_type_in_use');
        const archived = await transaction.classType.update({
          where: { id: classType.id },
          data: { archivedAt: dependencies.now() },
          select: classTypeSelect,
        });
        await audit(transaction, actor, {
          actionCode: 'class_type.archived',
          targetType: 'class_type',
          targetId: classType.id,
        });
        return archived;
      });
    },

    // Subscriptions keep their snapshots and open Purchase Intents keep their
    // amounts, so a new price applies to purchases started afterwards.
    createPlan: async (input: PlanInput, principal: AuthenticatedPrincipal) => {
      const actor = requireAdministrator(principal);
      requirePlanValues(input);
      const values = trimmed(input);
      return transact(async (transaction) => {
        const plan = await transaction.plan.create({
          data: values,
          select: planSelect,
        });
        await audit(transaction, actor, {
          actionCode: 'plan.created',
          targetType: 'plan',
          targetId: plan.id,
          metadata: { priceCentavos: plan.priceCentavos },
        });
        return plan;
      });
    },

    updatePlan: async (
      input: PlanInput & { planId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireAdministrator(principal);
      requirePlanValues(input);
      const {
        planId,
        name,
        durationMonths,
        classAllowance,
        priceCentavos,
        displayOrder,
      } = trimmed(input);
      return transact(async (transaction) => {
        const previous = await transaction.plan.findUnique({
          where: { id: planId },
          select: planSelect,
        });
        if (previous === null) throw new AdministrationError('plan_not_found');
        const plan = await transaction.plan.update({
          where: { id: planId },
          data: {
            name,
            durationMonths,
            classAllowance,
            priceCentavos,
            displayOrder,
          },
          select: planSelect,
        });
        await audit(transaction, actor, {
          actionCode: 'plan.updated',
          targetType: 'plan',
          targetId: planId,
          metadata: {
            previousPriceCentavos: previous.priceCentavos,
            priceCentavos: plan.priceCentavos,
          },
        });
        return plan;
      });
    },

    setPlanVisibility: async (
      input: { planId: string; visible: boolean },
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireAdministrator(principal);
      return transact(async (transaction) => {
        const previous = await transaction.plan.findUnique({
          where: { id: input.planId },
          select: planSelect,
        });
        if (previous === null) throw new AdministrationError('plan_not_found');
        if ((previous.hiddenAt === null) === input.visible) return previous;
        const plan = await transaction.plan.update({
          where: { id: input.planId },
          data: { hiddenAt: input.visible ? null : dependencies.now() },
          select: planSelect,
        });
        await audit(transaction, actor, {
          actionCode: 'plan.visibility_changed',
          targetType: 'plan',
          targetId: plan.id,
          metadata: { visible: input.visible },
        });
        return plan;
      });
    },
  };
};

export type CatalogAdministration = ReturnType<
  typeof createPrismaCatalogAdministration
>;
