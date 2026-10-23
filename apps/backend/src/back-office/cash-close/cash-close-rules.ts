// BKO-003 red checkpoint: the Cash Close rules are not written yet.
const notYet = (): never => {
  throw new Error('not implemented');
};

export const cashDayWindow: (businessDate: Date) => {
  from: Date;
  until: Date;
} = notYet;

export const requireCashCount: (input: {
  countedCentavos: number;
  note: string | null;
}) => { countedCentavos: number; note: string | null } = notYet;

export const describeCashClose: (close: {
  expectedCentavos: number;
  countedCentavos: number;
  currentExpectedCentavos: number;
}) => { differenceCentavos: number; adjustmentCentavos: number } = notYet;

export type CashDayStatus = 'closed' | 'missing' | 'open';

export const cashDayStatus: (day: {
  businessDate: Date;
  today: Date;
  closed: boolean;
}) => CashDayStatus = notYet;
