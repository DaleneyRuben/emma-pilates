import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { AuthenticationSessionRevocationReason } from '../../src/generated/prisma/enums';
import { PrismaAuthenticationGateway } from '../../src/system-identity/authentication/prisma-authentication-gateway';
import { revokeAuthenticationSessions } from '../../src/system-identity/authentication/revoke-authentication-sessions';
import { ImpersonationError } from '../../src/system-identity/impersonation/impersonation';
import { PrismaImpersonationGateway } from '../../src/system-identity/impersonation/prisma-impersonation-gateway';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('Impersonation persistence (FUT-001)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let gateway: PrismaImpersonationGateway;
  const startedAt = new Date('2026-10-22T15:00:00.000Z');
  const expiresAt = new Date('2026-10-22T15:30:00.000Z');

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    gateway = new PrismaImpersonationGateway(prisma);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const start = async (world: World, id = randomUUID()) => {
    await gateway.start({
      id,
      authenticationSessionId: world.sessionId,
      administratorAccountId: world.administratorAccountId,
      staffMember: {
        id: world.trainer.id,
        accountId: world.trainer.accountId,
        name: 'Camila Rojas',
        role: 'trainer',
        status: 'active',
      },
      startedAt,
      expiresAt,
    });
    return id;
  };

  it('describes a Staff Member with the status the picker needs', async () => {
    const world = await createWorld(prisma);

    await expect(gateway.findStaffMember(world.trainer.id)).resolves.toEqual({
      id: world.trainer.id,
      accountId: world.trainer.accountId,
      name: 'Camila Rojas',
      role: 'trainer',
      status: 'active',
    });
    await expect(
      gateway.findStaffMember(world.administratorStaffMemberId),
    ).resolves.toMatchObject({ role: 'administrator' });
    await expect(gateway.findStaffMember(randomUUID())).resolves.toBeNull();
  });

  it('starts one Impersonation per session and audits it to the Administrator', async () => {
    const world = await createWorld(prisma);
    const id = await start(world);

    await expect(
      prisma.impersonationSession.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({
      authenticationSessionId: world.sessionId,
      administratorAccountId: world.administratorAccountId,
      staffMemberId: world.trainer.id,
      startedAt,
      expiresAt,
      endedAt: null,
      endReason: null,
    });
    await expect(
      prisma.auditRecord.findFirst({
        where: { actionCode: 'impersonation.started', impersonationId: id },
      }),
    ).resolves.toMatchObject({
      actorKind: 'ACCOUNT',
      actorAccountId: world.administratorAccountId,
      actorRole: 'ADMINISTRATOR',
      targetType: 'account',
      targetId: world.trainer.accountId,
      correlationId: id,
      metadata: {
        staffMemberId: world.trainer.id,
        role: 'trainer',
        expiresAt: expiresAt.toISOString(),
      },
    });
    await expect(start(world)).rejects.toMatchObject(
      new ImpersonationError('impersonation_active'),
    );
  });

  it('resolves the session with its active Impersonation and the acting Staff Member', async () => {
    const world = await createWorld(prisma);
    const id = await start(world);

    await expect(
      new PrismaAuthenticationGateway(prisma).findSessionByCredentialDigest(
        world.credentialDigest,
      ),
    ).resolves.toMatchObject({
      accountId: world.administratorAccountId,
      impersonation: {
        id,
        expiresAt,
        staffMember: {
          id: world.trainer.id,
          accountId: world.trainer.accountId,
          role: 'TRAINER',
          branchIds: [world.branchId],
          accountDisabledAt: null,
          deletedAt: null,
        },
      },
    });
  });

  it('ends an Impersonation once, auditing «Salir» to the Administrator and an expiry to the system', async () => {
    const world = await createWorld(prisma);
    const id = await start(world);
    const endedAt = new Date('2026-10-22T15:12:00.000Z');

    await expect(
      gateway.end({
        impersonationId: id,
        endedAt,
        reason: 'exited',
        actorAccountId: world.administratorAccountId,
      }),
    ).resolves.toBe(true);
    await expect(
      prisma.impersonationSession.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({ endedAt, endReason: 'EXITED' });
    await expect(
      prisma.auditRecord.findFirst({
        where: { actionCode: 'impersonation.ended', impersonationId: id },
      }),
    ).resolves.toMatchObject({
      actorKind: 'ACCOUNT',
      actorAccountId: world.administratorAccountId,
      actorRole: 'ADMINISTRATOR',
      targetId: world.trainer.accountId,
      metadata: { reason: 'exited', durationSeconds: 720 },
    });
    await expect(
      gateway.end({
        impersonationId: id,
        endedAt,
        reason: 'exited',
        actorAccountId: world.administratorAccountId,
      }),
    ).resolves.toBe(false);
    await expect(
      prisma.auditRecord.count({ where: { impersonationId: id } }),
    ).resolves.toBe(2);

    const expired = await start(world);
    await expect(
      gateway.end({
        impersonationId: expired,
        endedAt: expiresAt,
        reason: 'expired',
        actorAccountId: null,
      }),
    ).resolves.toBe(true);
    await expect(
      prisma.auditRecord.findFirst({
        where: { actionCode: 'impersonation.ended', impersonationId: expired },
      }),
    ).resolves.toMatchObject({
      actorKind: 'SYSTEM',
      actorAccountId: null,
      actorRole: null,
      metadata: { reason: 'expired', durationSeconds: 1800 },
    });
  });

  it('ends the open Impersonation when the Administrator logs out or the session is revoked', async () => {
    const world = await createWorld(prisma);
    const id = await start(world);
    const revokedAt = new Date('2026-10-22T15:05:00.000Z');

    await prisma.$transaction((transaction) =>
      revokeAuthenticationSessions(
        transaction,
        { id: world.sessionId },
        {
          revokedAt,
          reason: AuthenticationSessionRevocationReason.LOGOUT,
        },
      ),
    );

    await expect(
      prisma.impersonationSession.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({ endedAt: revokedAt, endReason: 'LOGGED_OUT' });
    await expect(
      prisma.auditRecord.findFirst({
        where: { actionCode: 'impersonation.ended', impersonationId: id },
      }),
    ).resolves.toMatchObject({
      actorKind: 'ACCOUNT',
      actorAccountId: world.administratorAccountId,
      metadata: { reason: 'logged_out', durationSeconds: 300 },
    });

    const other = await createWorld(prisma);
    const otherId = await start(other);
    await prisma.$transaction((transaction) =>
      revokeAuthenticationSessions(
        transaction,
        { accountId: other.administratorAccountId },
        {
          revokedAt,
          reason: AuthenticationSessionRevocationReason.PASSWORD_CHANGED,
        },
      ),
    );
    await expect(
      prisma.impersonationSession.findUniqueOrThrow({ where: { id: otherId } }),
    ).resolves.toMatchObject({ endReason: 'REVOKED' });
    await expect(
      prisma.auditRecord.findFirst({
        where: { actionCode: 'impersonation.ended', impersonationId: otherId },
      }),
    ).resolves.toMatchObject({
      actorKind: 'SYSTEM',
      metadata: { reason: 'revoked' },
    });
  });
});

type World = {
  branchId: string;
  administratorAccountId: string;
  administratorStaffMemberId: string;
  sessionId: string;
  credentialDigest: Buffer;
  trainer: { id: string; accountId: string };
};

const activatedAt = new Date('2026-08-30T18:00:00.000Z');

const account = (id: string) => ({
  id,
  email: `${id}@example.com`,
  passwordHash: 'current-password-hash',
  emailVerifiedAt: activatedAt,
  activatedAt,
});

const createWorld = async (prisma: PrismaClient): Promise<World> => {
  const branch = await prisma.branch.create({
    data: { name: `Sucursal ${randomUUID()}`, address: 'Calle 1' },
  });
  const administratorAccountId = randomUUID();
  const administrator = await prisma.staffMember.create({
    data: {
      name: 'Paola Mendoza',
      role: 'ADMINISTRATOR',
      account: { create: account(administratorAccountId) },
    },
  });
  const trainerAccountId = randomUUID();
  const trainer = await prisma.staffMember.create({
    data: {
      name: 'Camila Rojas',
      role: 'TRAINER',
      account: { create: account(trainerAccountId) },
      branchAssignments: { create: { branchId: branch.id } },
    },
  });
  const credentialDigest = Buffer.from(randomUUID());
  const session = await prisma.authenticationSession.create({
    data: {
      accountId: administratorAccountId,
      surface: 'MOBILE',
      credentialDigest,
      createdAt: startedAt(),
      lastMeaningfulActivityAt: startedAt(),
      idleExpiresAt: new Date('2026-11-21T14:00:00.000Z'),
      absoluteExpiresAt: new Date('2027-01-20T14:00:00.000Z'),
    },
  });

  return {
    branchId: branch.id,
    administratorAccountId,
    administratorStaffMemberId: administrator.id,
    sessionId: session.id,
    credentialDigest,
    trainer: { id: trainer.id, accountId: trainerAccountId },
  };
};

const startedAt = () => new Date('2026-10-22T14:00:00.000Z');
