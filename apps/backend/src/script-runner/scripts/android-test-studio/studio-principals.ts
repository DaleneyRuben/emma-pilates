import { randomUUID } from 'node:crypto';
import { StaffRole, type PrismaClient } from '../../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../../system-identity/authentication/resolve-authenticated-principal';

type Role = 'administrator' | 'nutritionist';

const principalOf = (
  account: {
    id: string;
    staffMember: {
      id: string;
      branchAssignments: { branchId: string }[];
    } | null;
  },
  role: Role,
): AuthenticatedPrincipal => ({
  accountId: account.id,
  authenticationSessionId: randomUUID(),
  identity: {
    kind: 'staff',
    staffMemberId: account.staffMember!.id,
    role,
    branchIds: account.staffMember!.branchAssignments.map((a) => a.branchId),
  },
});

const staffSelect = {
  id: true,
  staffMember: {
    select: {
      id: true,
      branchAssignments: {
        where: { deletedAt: null },
        select: { branchId: true },
      },
    },
  },
} as const;

/** The oldest Administrator who has activated, if any. */
export const activeAdministrator = async (
  prisma: PrismaClient,
): Promise<AuthenticatedPrincipal | null> => {
  const account = await prisma.account.findFirst({
    where: {
      deletedAt: null,
      disabledAt: null,
      activatedAt: { not: null },
      staffMember: { is: { role: StaffRole.ADMINISTRATOR, deletedAt: null } },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: staffSelect,
  });
  return account === null ? null : principalOf(account, 'administrator');
};

// Every write is made, and audited, in the name of the studio's Administrator:
// the oldest one who activated, or else the one this script just invited,
// exactly as if she had done it on the admin web.
export const actingAdministrator = async (
  prisma: PrismaClient,
  administratorEmail: string,
): Promise<AuthenticatedPrincipal> => {
  const active = await activeAdministrator(prisma);
  if (active !== null) return active;
  const account = await prisma.account.findFirst({
    where: {
      email: administratorEmail,
      deletedAt: null,
      staffMember: { is: { role: StaffRole.ADMINISTRATOR, deletedAt: null } },
    },
    select: staffSelect,
  });
  if (account === null) throw new Error('administrator_missing');
  return principalOf(account, 'administrator');
};

// The Nutritionist publishes her own availability (EVL-001); the script does
// it as her, before she activates, as the admin web cannot.
export const nutritionistPrincipal = async (
  prisma: PrismaClient,
  staffMemberId: string,
): Promise<AuthenticatedPrincipal> => {
  const account = await prisma.account.findFirstOrThrow({
    where: { staffMemberId, deletedAt: null },
    select: staffSelect,
  });
  return principalOf(account, 'nutritionist');
};
