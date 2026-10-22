import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../src/generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';

// FUT-001: an open Impersonation row for an audit record to point at, on a
// fresh mobile session of the given Administrator Account.
export const openImpersonation = async (
  prisma: PrismaClient,
  input: { administratorAccountId: string; staffMemberId: string; now: Date },
): Promise<{ id: string; administratorAccountId: string }> => {
  const session = await prisma.authenticationSession.create({
    data: {
      accountId: input.administratorAccountId,
      surface: 'MOBILE',
      credentialDigest: Buffer.from(randomUUID()),
      createdAt: input.now,
      lastMeaningfulActivityAt: input.now,
      idleExpiresAt: new Date(input.now.getTime() + 30 * 24 * 3_600_000),
      absoluteExpiresAt: new Date(input.now.getTime() + 90 * 24 * 3_600_000),
    },
    select: { id: true },
  });
  const impersonation = await prisma.impersonationSession.create({
    data: {
      authenticationSessionId: session.id,
      administratorAccountId: input.administratorAccountId,
      staffMemberId: input.staffMemberId,
      startedAt: input.now,
      expiresAt: new Date(input.now.getTime() + 30 * 60_000),
    },
    select: { id: true },
  });
  return {
    id: impersonation.id,
    administratorAccountId: input.administratorAccountId,
  };
};

// The principal a request resolves to while the Administrator sees the app as
// `staffMember`: their identity, with the Impersonation beside it.
export const impersonating = (
  staffMember: AuthenticatedPrincipal,
  impersonation: { id: string; administratorAccountId: string },
): AuthenticatedPrincipal => ({
  ...staffMember,
  authenticationSessionId: randomUUID(),
  impersonation: {
    ...impersonation,
    staffMemberName: 'Camila Rojas',
    expiresAt: new Date('2026-10-22T15:30:00.000Z'),
  },
});
