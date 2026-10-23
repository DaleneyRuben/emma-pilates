import type { AdminPaymentDto } from "@pilates/api-contracts";

const notYet = (): never => {
  throw new Error("Not implemented");
};

export const paymentsCsv: (rows: readonly AdminPaymentDto[]) => string = notYet;

export const paymentsCsvName: (now: Date) => string = notYet;
