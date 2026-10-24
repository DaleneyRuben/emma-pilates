import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BackOfficeError } from '../back-office-errors';
import { requireLeadingTrainer } from './equipment-access';
import { equipmentKindOfClassType } from './equipment-kind';
import {
  equipmentOrder,
  equipmentSelect,
  recordIssue,
  toEquipmentView,
  translateEquipmentError,
  type IssueReport,
} from './equipment-records';

type Database = Prisma.TransactionClient | PrismaClient;

// Back Office reads the Session it reports from but never writes it (ADR-0011).
const findLedSession = async (
  database: Database,
  sessionId: string,
  principal: AuthenticatedPrincipal,
) => {
  const session = await database.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      branchId: true,
      trainerStaffMemberId: true,
      classType: { select: { name: true } },
    },
  });
  const actor = requireLeadingTrainer(principal, session);
  return { actor, session: session! };
};

// BKO-004: a Trainer reports a fault from a Session of her agenda, choosing
// among the Equipment of that Session's Branch.
export const createPrismaSessionEquipment = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => ({
  // The Session's own kind comes first; the rest keep the usual order.
  listSessionEquipment: async (
    input: { sessionId: string },
    principal: AuthenticatedPrincipal,
  ) => {
    const { session } = await findLedSession(
      prisma,
      input.sessionId,
      principal,
    );
    const kind = equipmentKindOfClassType(session.classType.name);
    const items = (
      await prisma.equipment.findMany({
        where: { branchId: session.branchId, archivedAt: null },
        orderBy: equipmentOrder,
        select: equipmentSelect,
      })
    ).map(toEquipmentView);
    return {
      sessionId: session.id,
      kind,
      items: [
        ...items.filter((item) => item.kind === kind),
        ...items.filter((item) => item.kind !== kind),
      ],
    };
  },

  reportSessionIssue: async (
    input: IssueReport & { sessionId: string; equipmentId: string },
    principal: AuthenticatedPrincipal,
  ) =>
    prisma
      .$transaction(async (transaction) => {
        const { actor, session } = await findLedSession(
          transaction,
          input.sessionId,
          principal,
        );
        const equipment = await transaction.equipment.findUnique({
          where: { id: input.equipmentId },
          select: { id: true, branchId: true, archivedAt: true },
        });
        if (equipment === null || equipment.branchId !== session.branchId) {
          throw new BackOfficeError('equipment_not_found');
        }
        return recordIssue(
          transaction,
          equipment,
          input,
          actor,
          dependencies.now(),
        );
      })
      .catch(translateEquipmentError),
});

export type SessionEquipment = ReturnType<typeof createPrismaSessionEquipment>;
