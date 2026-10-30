import { addCivilDays, boliviaInstant } from '../../time/bolivia-time';
import { BackOfficeError } from '../back-office-errors';

// A Cash Close covers one Bolivia civil day at one Branch (back-office/CONTEXT.md).
export const cashDayWindow = (
  businessDate: Date,
): { from: Date; until: Date } => ({
  from: boliviaInstant(businessDate, 0),
  until: boliviaInstant(addCivilDays(businessDate, 1), 0),
});

// Bs 1,000,000: far beyond a front desk's drawer, so a slip of the keyboard
// is refused instead of recorded.
const maximumCountCentavos = 100_000_000;
const maximumNoteLength = 500;

export const requireCashCount = (input: {
  countedCentavos: number;
  note: string | null;
}): { countedCentavos: number; note: string | null } => {
  const note = input.note?.trim() ?? '';
  if (
    !Number.isInteger(input.countedCentavos) ||
    input.countedCentavos < 0 ||
    input.countedCentavos > maximumCountCentavos ||
    note.length > maximumNoteLength
  ) {
    throw new BackOfficeError('invalid_back_office_value');
  }
  return {
    countedCentavos: input.countedCentavos,
    note: note === '' ? null : note,
  };
};

// The difference is what the drawer held against what the day's sales said
// at the close. The adjustment is how the day's sales moved after it: a late
// sale raises them. A void returns no money, so it moves nothing (owner
// decision 4, FIX-004).
export const describeCashClose = (close: {
  expectedCentavos: number;
  countedCentavos: number;
  currentExpectedCentavos: number;
}): { differenceCentavos: number; adjustmentCentavos: number } => ({
  differenceCentavos: close.countedCentavos - close.expectedCentavos,
  adjustmentCentavos: close.currentExpectedCentavos - close.expectedCentavos,
});

export type CashDayStatus = 'closed' | 'missing' | 'open';

// Today may still be closed; a past day with cash sales and no close is flagged.
export const cashDayStatus = (day: {
  businessDate: Date;
  today: Date;
  closed: boolean;
}): CashDayStatus => {
  if (day.closed) return 'closed';
  return day.businessDate.getTime() < day.today.getTime() ? 'missing' : 'open';
};
