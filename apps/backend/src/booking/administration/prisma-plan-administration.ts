import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  AdministrationError,
  requireAdministrator,
} from './administration-errors';
import { catalogWrites, trimmed } from './catalog-writes';
import { isValidPlanValidity } from '../catalog/plan-validity';

export type PlanInput = {
  name: string;
  durationDays: number;
  weeklyClassCap: number | null;
  classAllowance: number;
  priceCentavos: number;
  displayOrder: number;
};

export const planSelect = {
  id: true,
  name: true,
  durationDays: true,
  weeklyClassCap: true,
  classAllowance: true,
  priceCentavos: true,
  displayOrder: true,
  hiddenAt: true,
} satisfies Prisma.PlanSelect;

const requirePlanValues = (input: PlanInput) => {
  if (
    !isValidPlanValidity(input) ||
    input.name.trim() === '' ||
    input.classAllowance < 1 ||
    input.priceCentavos < 1
  ) {
    throw new AdministrationError('invalid_catalog_value');
  }
};

// ADM-001 slice A: Plan management for the admin web.
export const createPrismaPlanAdministration = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => {
  const { transact, audit } = catalogWrites(prisma, dependencies);

  return {
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
        durationDays,
        weeklyClassCap,
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
            durationDays,
            weeklyClassCap,
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
