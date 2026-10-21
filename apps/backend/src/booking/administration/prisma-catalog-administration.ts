import { SessionState } from '../../generated/prisma/enums';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import { endNutritionistAvailability } from '../evaluations/prisma-evaluation-commands';
import { changedValues } from './administration-audit';
import {
  AdministrationError,
  requireAdministrator,
} from './administration-errors';
import { catalogWrites, trimmed } from './catalog-writes';
import { createPrismaPlanAdministration } from './prisma-plan-administration';

export type { PlanInput } from './prisma-plan-administration';

export type BranchInput = { name: string; address: string };
export type ClassTypeInput = {
  name: string;
  description: string;
  defaultCapacity: number;
  equipmentNeeds: string | null;
};

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
// ADM-001 slice A: Branch, Class Type, and Plan management for the admin web.
export const createPrismaCatalogAdministration = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => {
  const { transact, audit } = catalogWrites(prisma, dependencies);
  const effectiveToday = () => boliviaDate(dependencies.now());

  return {
    ...createPrismaPlanAdministration(prisma, dependencies),

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
  };
};

export type CatalogAdministration = ReturnType<
  typeof createPrismaCatalogAdministration
>;
