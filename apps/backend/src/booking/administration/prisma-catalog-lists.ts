import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  requireAdministrator,
  requireOperations,
} from './administration-errors';

export type CatalogStatus = 'active' | 'archived' | 'all';
export type PlanVisibility = 'visible' | 'hidden' | 'all';
type Paging = { page: number; pageSize: number };

const archivedWhere = (status: CatalogStatus) =>
  status === 'all'
    ? {}
    : { archivedAt: status === 'active' ? null : { not: null } };

const hiddenWhere = (visibility: PlanVisibility) =>
  visibility === 'all'
    ? {}
    : { hiddenAt: visibility === 'visible' ? null : { not: null } };

const window = ({ page, pageSize }: Paging) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
});

// WEB-003: the admin catalog tables read one page at a time (ADR-0061),
// filtered only by the allowlisted status or visibility (ADR-0062), and
// always end their ordering on the identifier.
export const createPrismaCatalogLists = (prisma: PrismaClient) => ({
  listBranches: async (
    input: Paging & { status: CatalogStatus },
    principal: AuthenticatedPrincipal,
  ) => {
    requireOperations(principal);
    const where = archivedWhere(input.status) satisfies Prisma.BranchWhereInput;
    const [items, totalItems] = await prisma.$transaction([
      prisma.branch.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, address: true, archivedAt: true },
        ...window(input),
      }),
      prisma.branch.count({ where }),
    ]);
    return { items, page: input.page, pageSize: input.pageSize, totalItems };
  },

  listClassTypes: async (
    input: Paging & { status: CatalogStatus },
    principal: AuthenticatedPrincipal,
  ) => {
    requireOperations(principal);
    const where = archivedWhere(
      input.status,
    ) satisfies Prisma.ClassTypeWhereInput;
    const [items, totalItems] = await prisma.$transaction([
      prisma.classType.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          description: true,
          defaultCapacity: true,
          equipmentNeeds: true,
          archivedAt: true,
        },
        ...window(input),
      }),
      prisma.classType.count({ where }),
    ]);
    return { items, page: input.page, pageSize: input.pageSize, totalItems };
  },

  listPlans: async (
    input: Paging & { visibility: PlanVisibility },
    principal: AuthenticatedPrincipal,
  ) => {
    requireAdministrator(principal);
    const where = hiddenWhere(input.visibility) satisfies Prisma.PlanWhereInput;
    const [items, totalItems] = await prisma.$transaction([
      prisma.plan.findMany({
        where,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          durationMonths: true,
          classAllowance: true,
          priceCentavos: true,
          displayOrder: true,
          hiddenAt: true,
        },
        ...window(input),
      }),
      prisma.plan.count({ where }),
    ]);
    return { items, page: input.page, pageSize: input.pageSize, totalItems };
  },
});

export type CatalogLists = ReturnType<typeof createPrismaCatalogLists>;
