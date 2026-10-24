import { BackOfficeError } from '../back-office-errors';
import {
  cashDayStatus,
  cashDayWindow,
  describeCashClose,
  requireCashCount,
} from './cash-close-rules';

const civil = (value: string) => new Date(`${value}T00:00:00.000Z`);

const codeOf = (work: () => unknown): string => {
  try {
    work();
    return 'resolved';
  } catch (error) {
    return error instanceof BackOfficeError ? error.code : String(error);
  }
};

describe('cash close rules', () => {
  it('spans one Bolivia civil day, midnight to midnight at UTC-4', () => {
    expect(cashDayWindow(civil('2026-10-23'))).toEqual({
      from: new Date('2026-10-23T04:00:00.000Z'),
      until: new Date('2026-10-24T04:00:00.000Z'),
    });
  });

  it('accepts whole centavos from zero and trims the note to null when blank', () => {
    expect(requireCashCount({ countedCentavos: 0, note: '   ' })).toEqual({
      countedCentavos: 0,
      note: null,
    });
    expect(
      requireCashCount({ countedCentavos: 12_550, note: ' Faltó cambio ' }),
    ).toEqual({ countedCentavos: 12_550, note: 'Faltó cambio' });
    expect(requireCashCount({ countedCentavos: 100, note: null })).toEqual({
      countedCentavos: 100,
      note: null,
    });
  });

  it('refuses a negative, fractional, or absurd count and a note over 500 characters', () => {
    for (const countedCentavos of [-1, 10.5, 100_000_001]) {
      expect(
        codeOf(() => requireCashCount({ countedCentavos, note: null })),
      ).toBe('invalid_back_office_value');
    }
    expect(
      codeOf(() =>
        requireCashCount({ countedCentavos: 0, note: 'x'.repeat(501) }),
      ),
    ).toBe('invalid_back_office_value');
  });

  it('reports the difference against the expected cash and any later adjustment', () => {
    // Counted Bs 10 short; a Bs 50 sale was voided after the close.
    expect(
      describeCashClose({
        expectedCentavos: 30_000,
        countedCentavos: 29_000,
        currentExpectedCentavos: 25_000,
      }),
    ).toEqual({ differenceCentavos: -1_000, adjustmentCentavos: -5_000 });
    expect(
      describeCashClose({
        expectedCentavos: 30_000,
        countedCentavos: 30_000,
        currentExpectedCentavos: 30_000,
      }),
    ).toEqual({ differenceCentavos: 0, adjustmentCentavos: 0 });
  });

  it('flags a past day with cash sales and no close, never today or a closed day', () => {
    const today = civil('2026-10-23');
    expect(
      cashDayStatus({
        businessDate: civil('2026-10-22'),
        today,
        closed: false,
      }),
    ).toBe('missing');
    expect(cashDayStatus({ businessDate: today, today, closed: false })).toBe(
      'open',
    );
    expect(
      cashDayStatus({ businessDate: civil('2026-10-22'), today, closed: true }),
    ).toBe('closed');
  });
});
