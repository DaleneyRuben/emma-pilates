import type { PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { CashDayStatus } from './cash-close-rules';

export type CashCloseView = {
  id: string;
  branchId: string;
  businessDate: Date;
  expectedCentavos: number;
  cashPaymentCount: number;
  countedCentavos: number;
  differenceCentavos: number;
  note: string | null;
  closedAt: Date;
  closedByName: string;
};

export type CashToday = {
  branchId: string;
  businessDate: Date;
  expectedCentavos: number;
  cashPaymentCount: number;
  close: CashCloseView | null;
};

export type CashDay = {
  businessDate: Date;
  status: CashDayStatus;
  cashSalesCentavos: number;
  cashPaymentCount: number;
  close: (CashCloseView & { adjustmentCentavos: number }) | null;
};

export type CashCloseHistory = {
  branchId: string;
  month: string;
  missingDays: number;
  days: CashDay[];
};

const notYet = (): never => {
  throw new Error('not implemented');
};

// BKO-003 red checkpoint: the Cash Close use cases are not written yet.
export const createPrismaCashCloses = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => {
  void prisma;
  void dependencies;
  const readToday: (
    query: { branchId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<CashToday> = notYet;
  const recordCashClose: (
    input: { branchId: string; countedCentavos: number; note: string | null },
    principal: AuthenticatedPrincipal,
    idempotencyKey: string,
  ) => Promise<CashCloseView> = notYet;
  const listCashCloses: (
    query: { branchId: string; month: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<CashCloseHistory> = notYet;
  return { readToday, recordCashClose, listCashCloses };
};

export type CashCloses = ReturnType<typeof createPrismaCashCloses>;
