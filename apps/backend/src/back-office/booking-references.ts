import type { Prisma, PrismaClient } from '../generated/prisma/client';
import { BackOfficeError } from './back-office-errors';

// Back Office's read-only dependencies on Booking & Membership tables
// (ADR-0011): it checks references exist but never writes them.
export const requireActiveBranch = async (
  database: Prisma.TransactionClient | PrismaClient,
  branchId: string,
) => {
  const branch = await database.branch.findUnique({
    where: { id: branchId },
    select: { archivedAt: true },
  });
  if (branch === null) throw new BackOfficeError('branch_not_found');
  if (branch.archivedAt !== null) {
    throw new BackOfficeError('branch_archived');
  }
};
