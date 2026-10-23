import type { PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { EquipmentKind } from './equipment-kind';

export type EquipmentStatus = 'working' | 'faulty' | 'out_of_service';

export type EquipmentView = {
  id: string;
  branchId: string;
  kind: EquipmentKind;
  number: number;
  status: EquipmentStatus;
  openIssueCount: number;
  archivedAt: Date | null;
};

export type EquipmentIssueView = {
  id: string;
  equipmentId: string;
  equipmentKind: EquipmentKind;
  equipmentNumber: number;
  description: string;
  outOfService: boolean;
  reportedAt: Date;
  reportedByName: string;
  resolvedAt: Date | null;
  resolvedByName: string | null;
};

export type EquipmentIssueStatus = 'open' | 'resolved';

export type FlaggedSession = {
  sessionId: string;
  kind: EquipmentKind;
  capacity: number;
  workingCount: number;
};

const pending = (...request: unknown[]): never => {
  void request;
  throw new Error('not implemented');
};

// BKO-004: the Administrator's Equipment list, faults, and capacity flags.
export const createPrismaEquipment = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => {
  void prisma;
  void dependencies;
  return {
    listEquipment: (
      query: { branchId: string },
      principal: AuthenticatedPrincipal,
    ): Promise<{ items: EquipmentView[] }> => pending(query, principal),
    createEquipment: (
      input: { branchId: string; kind: EquipmentKind; number: number },
      principal: AuthenticatedPrincipal,
    ): Promise<EquipmentView> => pending(input, principal),
    archiveEquipment: (
      input: { equipmentId: string },
      principal: AuthenticatedPrincipal,
    ): Promise<EquipmentView> => pending(input, principal),
    reportIssue: (
      input: {
        equipmentId: string;
        description: string;
        outOfService: boolean;
      },
      principal: AuthenticatedPrincipal,
    ): Promise<EquipmentIssueView> => pending(input, principal),
    resolveIssue: (
      input: { issueId: string },
      principal: AuthenticatedPrincipal,
    ): Promise<EquipmentIssueView> => pending(input, principal),
    listIssues: (
      query: {
        branchId: string;
        status: EquipmentIssueStatus;
        page: number;
        pageSize: number;
      },
      principal: AuthenticatedPrincipal,
    ): Promise<{
      items: EquipmentIssueView[];
      page: number;
      pageSize: number;
      totalItems: number;
    }> => pending(query, principal),
    listFlaggedSessions: (
      query: { branchId: string; from: Date; until: Date },
      principal: AuthenticatedPrincipal,
    ): Promise<FlaggedSession[]> => pending(query, principal),
  };
};

export type EquipmentOperations = ReturnType<typeof createPrismaEquipment>;
