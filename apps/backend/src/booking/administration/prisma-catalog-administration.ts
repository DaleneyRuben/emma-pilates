import { randomUUID } from 'node:crypto';
import { retrySerializable } from '../../database/retry-serializable';
import {
  AuditActorKind,
  AuditOutcome,
  SessionState,
  StaffRole,
} from '../../generated/prisma/enums';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import { endNutritionistAvailability } from '../evaluations/prisma-evaluation-commands';
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
  durationMinutes: number;
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
  durationMinutes: true,
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

  const recordPlanAudit = (
    transaction: Transaction,
    actor: AdministratorActor,
    input: {
      actionCode: 'plan.created' | 'plan.updated' | 'plan.visibility_changed';
      planId: string;
      metadata: Prisma.InputJsonObject;
    },
  ) =>
    transaction.auditRecord.create({
      data: {
        actionCode: input.actionCode,
        outcome: AuditOutcome.SUCCEEDED,
        actorKind: AuditActorKind.ACCOUNT,
        actorAccountId: actor.accountId,
        actorRole: StaffRole.ADMINISTRATOR,
        targetType: 'plan',
        targetId: input.planId,
        correlationId: randomUUID(),
        metadata: input.metadata,
        occurredAt: dependencies.now(),
      },
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
    listBranches: async (principal: AuthenticatedPrincipal) => {
      requireAdministrator(principal);
      return prisma.branch.findMany({
        orderBy: [
          { archivedAt: { sort: 'asc', nulls: 'first' } },
          { name: 'asc' },
        ],
        select: branchSelect,
      });
    },

    createBranch: async (
      input: BranchInput,
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      const values = trimmed(input);
      return transact((transaction) =>
        transaction.branch.create({ data: values, select: branchSelect }),
      );
    },

    updateBranch: async (
      input: BranchInput & { branchId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      const { branchId, ...values } = trimmed(input);
      return transact(async (transaction) => {
        const updated = await transaction.branch.updateMany({
          where: { id: branchId },
          data: values,
        });
        if (updated.count === 0)
          throw new AdministrationError('branch_not_found');
        return transaction.branch.findUniqueOrThrow({
          where: { id: branchId },
          select: branchSelect,
        });
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
        for (const { nutritionistStaffMemberId } of nutritionists) {
          await endNutritionistAvailability(transaction, {
            staffMemberId: nutritionistStaffMemberId,
            branchId: branch.id,
            actorAccountId: actor.accountId,
            now,
          });
        }
        return transaction.branch.update({
          where: { id: branch.id },
          data: { archivedAt: now },
          select: branchSelect,
        });
      });
    },

    listClassTypes: async (principal: AuthenticatedPrincipal) => {
      requireAdministrator(principal);
      return prisma.classType.findMany({
        orderBy: [
          { archivedAt: { sort: 'asc', nulls: 'first' } },
          { name: 'asc' },
        ],
        select: classTypeSelect,
      });
    },

    createClassType: async (
      input: ClassTypeInput,
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      const values = trimmed(input);
      return transact((transaction) =>
        transaction.classType.create({ data: values, select: classTypeSelect }),
      );
    },

    // Existing Sessions keep their facts; new durations apply to Sessions
    // materialized afterwards (follow-up 39 §2).
    updateClassType: async (
      input: ClassTypeInput & { classTypeId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      const {
        classTypeId,
        name,
        description,
        durationMinutes,
        defaultCapacity,
        equipmentNeeds,
      } = trimmed(input);
      return transact(async (transaction) => {
        const updated = await transaction.classType.updateMany({
          where: { id: classTypeId },
          data: {
            name,
            description,
            durationMinutes,
            defaultCapacity,
            equipmentNeeds,
          },
        });
        if (updated.count === 0) {
          throw new AdministrationError('class_type_not_found');
        }
        return transaction.classType.findUniqueOrThrow({
          where: { id: classTypeId },
          select: classTypeSelect,
        });
      });
    },

    archiveClassType: async (
      input: { classTypeId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
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
        return transaction.classType.update({
          where: { id: classType.id },
          data: { archivedAt: dependencies.now() },
          select: classTypeSelect,
        });
      });
    },

    listPlans: async (principal: AuthenticatedPrincipal) => {
      requireAdministrator(principal);
      return prisma.plan.findMany({
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: planSelect,
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
        await recordPlanAudit(transaction, actor, {
          actionCode: 'plan.created',
          planId: plan.id,
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
        await recordPlanAudit(transaction, actor, {
          actionCode: 'plan.updated',
          planId,
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
        await recordPlanAudit(transaction, actor, {
          actionCode: 'plan.visibility_changed',
          planId: plan.id,
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
