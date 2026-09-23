import type { PgBoss } from 'pg-boss';
import { toPrismaBytes } from '../../database/prisma-bytes';
import {
  AuditActorKind,
  AuditOutcome,
  AuthenticationTokenPurpose,
  StaffRole,
} from '../../generated/prisma/enums';
import type { PrismaClient } from '../../generated/prisma/client';
import { PrismaClientRegistrationTransaction } from '../registration/prisma-client-registration-unit-of-work';
import type {
  AdministratorBootstrapTransaction,
  AdministratorBootstrapUnitOfWork,
} from './bootstrap-first-administrator';

type UnitOfWorkDependencies = {
  prisma: PrismaClient;
  boss: Pick<PgBoss, 'send'>;
  digestEmail(email: string): Uint8Array;
  now?: () => Date;
};

// Transaction-scoped advisory lock key shared by every bootstrap run.
const bootstrapLockKey = 'system.first_administrator_bootstrap';

export class PrismaAdministratorBootstrapUnitOfWork implements AdministratorBootstrapUnitOfWork {
  constructor(private readonly dependencies: UnitOfWorkDependencies) {}

  execute<Result>(
    work: (transaction: AdministratorBootstrapTransaction) => Promise<Result>,
  ): Promise<Result> {
    const { prisma, boss } = this.dependencies;
    const now = this.dependencies.now ?? (() => new Date());

    return prisma.$transaction((transaction) => {
      const registration = new PrismaClientRegistrationTransaction(
        transaction,
        boss,
        (email) => this.dependencies.digestEmail(email),
        now,
      );

      return work({
        lockBootstrap: async () => {
          await transaction.$executeRaw`select pg_advisory_xact_lock(hashtext(${bootstrapLockKey}))`;
        },
        findAdministratorAccounts: async () => {
          const accounts = await transaction.account.findMany({
            where: { staffMember: { role: StaffRole.ADMINISTRATOR } },
            select: {
              id: true,
              email: true,
              activatedAt: true,
              staffMemberId: true,
            },
          });
          return accounts.map((account) => ({
            accountId: account.id,
            staffMemberId: account.staffMemberId!,
            email: account.email,
            activated: account.activatedAt !== null,
          }));
        },
        findAccountByEmail: (email) =>
          transaction.account.findUnique({
            where: { email },
            select: { id: true },
          }),
        canIssueAuthenticationEmail: (input) =>
          registration.canIssueAuthenticationEmail(input),
        recordIssuedAuthenticationEmail: (input) =>
          registration.recordIssuedAuthenticationEmail(input),
        createPendingAdministrator: async (input) => {
          await transaction.staffMember.create({
            data: {
              id: input.staffMemberId,
              name: input.name,
              role: StaffRole.ADMINISTRATOR,
              account: {
                create: {
                  id: input.accountId,
                  email: input.email,
                  pendingExpiresAt: input.pendingExpiresAt,
                  authenticationTokens: {
                    create: {
                      id: input.activationToken.id,
                      purpose: AuthenticationTokenPurpose.ACTIVATION,
                      tokenDigest: toPrismaBytes(input.activationToken.digest),
                      expiresAt: input.activationToken.expiresAt,
                    },
                  },
                },
              },
            },
          });
        },
        replaceStaffInvitationActivation: (input) =>
          registration.replaceStaffInvitationActivation(input),
        scheduleAuthenticationEmail: (job) =>
          registration.scheduleAuthenticationEmail(job),
        recordAudit: async (audit) => {
          await transaction.auditRecord.create({
            data: {
              actionCode: audit.actionCode,
              outcome: AuditOutcome.SUCCEEDED,
              actorKind: AuditActorKind.BOOTSTRAP,
              targetType: 'account',
              targetId: audit.targetAccountId,
              correlationId: audit.correlationId,
              occurredAt: audit.occurredAt,
            },
          });
        },
      });
    });
  }
}
