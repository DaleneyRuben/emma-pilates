import {
  AuditActorKind,
  AuditOutcome,
  ImpersonationEndReason,
  StaffRole,
} from '../../generated/prisma/enums';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  type ImpersonationEndReason as EndReason,
  ImpersonationError,
  type ImpersonationGateway,
  type ImpersonationStaffMember,
} from './impersonation';

const endReasons: Record<EndReason, ImpersonationEndReason> = {
  exited: ImpersonationEndReason.EXITED,
  expired: ImpersonationEndReason.EXPIRED,
  logged_out: ImpersonationEndReason.LOGGED_OUT,
  revoked: ImpersonationEndReason.REVOKED,
};

const isActiveConflict = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 'P2002';

// Ends one open Impersonation and audits it: an Account actor for «Salir» and
// logout, the system for an expiry or a revocation nobody asked for.
export const endImpersonationRow = async (
  transaction: Prisma.TransactionClient,
  input: {
    impersonationId: string;
    endedAt: Date;
    reason: EndReason;
    actorAccountId: string | null;
  },
): Promise<boolean> => {
  const row = await transaction.impersonationSession.findFirst({
    where: {
      id: input.impersonationId,
      endedAt: null,
      deletedAt: null,
    },
    select: {
      id: true,
      startedAt: true,
      staffMember: { select: { account: { select: { id: true } } } },
    },
  });
  if (row === null) return false;

  await transaction.impersonationSession.update({
    where: { id: row.id },
    data: { endedAt: input.endedAt, endReason: endReasons[input.reason] },
  });
  await transaction.auditRecord.create({
    data: {
      actionCode: 'impersonation.ended',
      outcome: AuditOutcome.SUCCEEDED,
      actorKind:
        input.actorAccountId === null
          ? AuditActorKind.SYSTEM
          : AuditActorKind.ACCOUNT,
      actorAccountId: input.actorAccountId,
      actorRole: input.actorAccountId === null ? null : StaffRole.ADMINISTRATOR,
      targetType: 'account',
      targetId: row.staffMember.account?.id ?? null,
      correlationId: row.id,
      impersonationId: row.id,
      metadata: {
        reason: input.reason,
        durationSeconds: Math.round(
          (input.endedAt.getTime() - row.startedAt.getTime()) / 1_000,
        ),
      },
      occurredAt: input.endedAt,
    },
  });
  return true;
};

// Logging out or revoking the Administrator's session ends what it carried.
export const endOpenImpersonations = async (
  transaction: Prisma.TransactionClient,
  authenticationSessionIds: string[],
  input: { endedAt: Date; reason: 'logged_out' | 'revoked' },
): Promise<void> => {
  if (authenticationSessionIds.length === 0) return;
  const open = await transaction.impersonationSession.findMany({
    where: {
      authenticationSessionId: { in: authenticationSessionIds },
      endedAt: null,
      deletedAt: null,
    },
    select: { id: true, administratorAccountId: true },
  });
  for (const row of open) {
    await endImpersonationRow(transaction, {
      impersonationId: row.id,
      endedAt: input.endedAt,
      reason: input.reason,
      actorAccountId:
        input.reason === 'logged_out' ? row.administratorAccountId : null,
    });
  }
};

export class PrismaImpersonationGateway implements ImpersonationGateway {
  constructor(private readonly prisma: PrismaClient) {}

  async findStaffMember(
    staffMemberId: string,
  ): Promise<ImpersonationStaffMember | null> {
    const member = await this.prisma.staffMember.findFirst({
      where: { id: staffMemberId, deletedAt: null },
      select: {
        id: true,
        name: true,
        role: true,
        account: {
          select: { id: true, activatedAt: true, disabledAt: true },
        },
      },
    });
    if (member === null || member.account === null) return null;
    return {
      id: member.id,
      accountId: member.account.id,
      name: member.name,
      role: member.role.toLowerCase() as ImpersonationStaffMember['role'],
      status:
        member.account.disabledAt !== null
          ? 'deactivated'
          : member.account.activatedAt === null
            ? 'pending'
            : 'active',
    };
  }

  async start(
    input: Parameters<ImpersonationGateway['start']>[0],
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.impersonationSession.create({
          data: {
            id: input.id,
            authenticationSessionId: input.authenticationSessionId,
            administratorAccountId: input.administratorAccountId,
            staffMemberId: input.staffMember.id,
            startedAt: input.startedAt,
            expiresAt: input.expiresAt,
          },
        });
        await transaction.auditRecord.create({
          data: {
            actionCode: 'impersonation.started',
            outcome: AuditOutcome.SUCCEEDED,
            actorKind: AuditActorKind.ACCOUNT,
            actorAccountId: input.administratorAccountId,
            actorRole: StaffRole.ADMINISTRATOR,
            targetType: 'account',
            targetId: input.staffMember.accountId,
            correlationId: input.id,
            impersonationId: input.id,
            metadata: {
              staffMemberId: input.staffMember.id,
              role: input.staffMember.role,
              expiresAt: input.expiresAt.toISOString(),
            },
            occurredAt: input.startedAt,
          },
        });
      });
    } catch (error) {
      if (isActiveConflict(error)) {
        throw new ImpersonationError('impersonation_active');
      }
      throw error;
    }
  }

  end(input: Parameters<ImpersonationGateway['end']>[0]): Promise<boolean> {
    return this.prisma.$transaction((transaction) =>
      endImpersonationRow(transaction, input),
    );
  }
}
