import type { PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { EquipmentKind } from './equipment-kind';
import type { EquipmentIssueView, EquipmentView } from './prisma-equipment';

const pending = (...request: unknown[]): never => {
  void request;
  throw new Error('not implemented');
};

// BKO-004: a Trainer reports a fault from a Session of her agenda.
export const createPrismaSessionEquipment = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => {
  void prisma;
  void dependencies;
  return {
    listSessionEquipment: (
      input: { sessionId: string },
      principal: AuthenticatedPrincipal,
    ): Promise<{
      sessionId: string;
      kind: EquipmentKind | null;
      items: EquipmentView[];
    }> => pending(input, principal),
    reportSessionIssue: (
      input: {
        sessionId: string;
        equipmentId: string;
        description: string;
        outOfService: boolean;
      },
      principal: AuthenticatedPrincipal,
    ): Promise<EquipmentIssueView> => pending(input, principal),
  };
};

export type SessionEquipment = ReturnType<typeof createPrismaSessionEquipment>;
