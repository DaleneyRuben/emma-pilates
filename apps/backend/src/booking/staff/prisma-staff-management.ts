import type { PgBoss } from 'pg-boss';
import { retrySerializable } from '../../database/retry-serializable';
import {
  AuditActorKind,
  AuditOutcome,
  AuthenticationTokenPurpose,
  SessionState,
  StaffRole,
} from '../../generated/prisma/enums';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  createStaffAccountOperations,
  type StaffAccountDependencies,
} from '../../system-identity/staff-accounts/staff-accounts';
import { boliviaDate } from '../../time/bolivia-time';
import { endNutritionistAvailability } from '../evaluations/prisma-evaluation-commands';
import type {
  StaffManagementTransaction,
  StaffManagementUnitOfWork,
  StaffMemberRecord,
  StaffRoleName,
  StaffStatus,
} from './staff-management';

const roles: Record<StaffRoleName, StaffRole> = {
  trainer: StaffRole.TRAINER,
  nutritionist: StaffRole.NUTRITIONIST,
  assistant: StaffRole.ASSISTANT,
  administrator: StaffRole.ADMINISTRATOR,
};
const roleNames = Object.fromEntries(
  Object.entries(roles).map(([name, role]) => [role, name]),
) as Record<StaffRole, StaffRoleName>;

const staffSelect = {
  id: true,
  name: true,
  phone: true,
  role: true,
  branchAssignments: {
    select: { branchId: true },
    orderBy: { branchId: 'asc' },
  },
  account: {
    select: {
      id: true,
      email: true,
      activatedAt: true,
      disabledAt: true,
      authenticationTokens: {
        where: {
          purpose: AuthenticationTokenPurpose.ACTIVATION,
          usedAt: null,
          invalidatedAt: null,
        },
        orderBy: { expiresAt: 'desc' },
        take: 1,
        select: { expiresAt: true },
      },
    },
  },
} satisfies Prisma.StaffMemberSelect;

type StaffRow = Prisma.StaffMemberGetPayload<{ select: typeof staffSelect }>;

const statusOf = (account: NonNullable<StaffRow['account']>): StaffStatus => {
  if (account.disabledAt !== null) return 'deactivated';
  return account.activatedAt === null ? 'pending' : 'active';
};

const toRecord = (row: StaffRow): StaffMemberRecord | null => {
  if (row.account === null) return null;
  const status = statusOf(row.account);
  return {
    id: row.id,
    accountId: row.account.id,
    name: row.name,
    email: row.account.email,
    phone: row.phone,
    role: roleNames[row.role],
    branchIds: row.branchAssignments.map(({ branchId }) => branchId),
    status,
    activationExpiresAt:
      status === 'pending'
        ? (row.account.authenticationTokens[0]?.expiresAt ?? null)
        : null,
  };
};

const statusFilter = (status: StaffStatus): Prisma.AccountWhereInput => {
  if (status === 'deactivated') return { disabledAt: { not: null } };
  return status === 'active'
    ? { disabledAt: null, activatedAt: { not: null } }
    : { disabledAt: null, activatedAt: null };
};

const serializable = {
  isolationLevel: 'Serializable',
} as const satisfies { isolationLevel: Prisma.TransactionIsolationLevel };

export class PrismaStaffManagementUnitOfWork implements StaffManagementUnitOfWork {
  constructor(
    private readonly dependencies: Omit<StaffAccountDependencies, 'newId'> & {
      prisma: PrismaClient;
      boss: Pick<PgBoss, 'send'>;
      newId?: () => string;
    },
  ) {}

  // Serializable with bounded retries: the last-Administrator and Trainer
  // guards read rows a concurrent change could invalidate (ADR-0056).
  execute<Result>(
    work: (transaction: StaffManagementTransaction) => Promise<Result>,
  ): Promise<Result> {
    const { prisma } = this.dependencies;
    return retrySerializable(() =>
      prisma.$transaction(
        (transaction) => work(this.transactionFor(transaction)),
        serializable,
      ),
    );
  }

  private transactionFor(
    transaction: Prisma.TransactionClient,
  ): StaffManagementTransaction {
    const accounts = createStaffAccountOperations(transaction, {
      boss: this.dependencies.boss,
      digestEmail: (email) => this.dependencies.digestEmail(email),
      linkCipher: this.dependencies.linkCipher,
      tokenIssuer: this.dependencies.tokenIssuer,
      now: this.dependencies.now,
      newId: this.dependencies.newId ?? (() => crypto.randomUUID()),
    });

    return {
      findAccountByEmail: (email) => accounts.findAccountByEmail(email),
      findStaffMember: async (staffMemberId) => {
        const row = await transaction.staffMember.findUnique({
          where: { id: staffMemberId },
          select: staffSelect,
        });
        return row === null ? null : toRecord(row);
      },
      findUsableBranchIds: async (branchIds) =>
        (
          await transaction.branch.findMany({
            where: { id: { in: branchIds }, archivedAt: null },
            select: { id: true },
          })
        ).map(({ id }) => id),
      countActiveAdministrators: () =>
        transaction.account.count({
          where: {
            activatedAt: { not: null },
            disabledAt: null,
            staffMember: { role: StaffRole.ADMINISTRATOR },
          },
        }),
      countTrainerCommitments: async (input) => {
        const branchFilter =
          input.branchIds === undefined
            ? {}
            : { branchId: { in: input.branchIds } };
        const [sessions, schedules] = await Promise.all([
          transaction.session.count({
            where: {
              trainerStaffMemberId: input.staffMemberId,
              state: SessionState.SCHEDULED,
              startsAt: { gt: input.now },
              ...branchFilter,
            },
          }),
          transaction.sessionSchedule.count({
            where: {
              trainerStaffMemberId: input.staffMemberId,
              OR: [
                { effectiveUntil: null },
                {
                  effectiveUntil: {
                    gt: boliviaDate(input.now),
                  },
                },
              ],
              ...branchFilter,
            },
          }),
        ]);
        return sessions + schedules;
      },
      canIssueActivationEmail: (input) =>
        accounts.canIssueActivationEmail(input),
      createPendingStaffMember: async (input) => {
        await transaction.staffMember.create({
          data: {
            id: input.staffMemberId,
            name: input.name,
            phone: input.phone,
            role: roles[input.role],
            branchAssignments: {
              create: input.branchIds.map((branchId) => ({ branchId })),
            },
          },
        });
        await accounts.createPendingAccount({
          accountId: input.accountId,
          staffMemberId: input.staffMemberId,
          email: input.email,
          pendingExpiresAt: input.pendingExpiresAt,
          activationExpiresAt: input.activationExpiresAt,
        });
      },
      reissueActivation: (input) => accounts.reissueActivation(input),
      setRole: async (input) => {
        await transaction.staffMember.update({
          where: { id: input.staffMemberId },
          data: { role: roles[input.role] },
        });
      },
      replaceBranches: async (input) => {
        await transaction.staffBranchAssignment.deleteMany({
          where: {
            staffMemberId: input.staffMemberId,
            branchId: { notIn: input.branchIds },
          },
        });
        await transaction.staffBranchAssignment.createMany({
          data: input.branchIds.map((branchId) => ({
            staffMemberId: input.staffMemberId,
            branchId,
          })),
          skipDuplicates: true,
        });
      },
      endNutritionistAvailability: async (input) => {
        await endNutritionistAvailability(transaction, input);
      },
      disableAccount: (input) => accounts.disableAccount(input),
      recordAudit: async (audit) => {
        await transaction.auditRecord.create({
          data: {
            actionCode: audit.actionCode,
            outcome: AuditOutcome.SUCCEEDED,
            actorKind: AuditActorKind.ACCOUNT,
            actorAccountId: audit.actorAccountId,
            actorRole: StaffRole.ADMINISTRATOR,
            targetType: 'account',
            targetId: audit.targetAccountId,
            correlationId: audit.correlationId,
            metadata: audit.metadata ?? undefined,
            occurredAt: audit.occurredAt,
          },
        });
      },
    };
  }
}

export type StaffDirectoryQuery = {
  page: number;
  pageSize: number;
  role?: StaffRoleName;
  branchId?: string;
  status?: StaffStatus;
};

export type StaffDirectoryPage = {
  items: StaffMemberRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
};

// Administrator reads for the admin-web staff table (ADR-0061 page-and-offset).
export const createPrismaStaffDirectory = (prisma: PrismaClient) => ({
  list: async (query: StaffDirectoryQuery): Promise<StaffDirectoryPage> => {
    const where: Prisma.StaffMemberWhereInput = {
      account:
        query.status === undefined
          ? { isNot: null }
          : { is: statusFilter(query.status) },
      ...(query.role === undefined ? {} : { role: roles[query.role] }),
      ...(query.branchId === undefined
        ? {}
        : { branchAssignments: { some: { branchId: query.branchId } } }),
    };
    const [rows, totalItems] = await Promise.all([
      prisma.staffMember.findMany({
        where,
        select: staffSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.staffMember.count({ where }),
    ]);
    return {
      items: rows.flatMap((row) => toRecord(row) ?? []),
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
    };
  },
  read: async (staffMemberId: string): Promise<StaffMemberRecord | null> => {
    const row = await prisma.staffMember.findUnique({
      where: { id: staffMemberId },
      select: staffSelect,
    });
    return row === null ? null : toRecord(row);
  },
});
