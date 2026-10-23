import { trainerPay } from './trainer-pay';

// Decisions section 8, in centavos. The opening rates are the ones the
// statement reads; a later PayRateRule must not need a code edit.
const openingRates = {
  classCentavos: 6_500,
  includedStudents: 4,
  extraStudentCentavos: 800,
  minimumNotMetCentavos: 2_500,
  commissionPercent: 10,
};

describe('trainer pay', () => {
  it('pays Bs 65 for a class of 3 and Bs 65 plus Bs 16 for a class of 6', () => {
    const pay = trainerPay(openingRates, {
      sessions: [
        { bookingsAtWindowClose: 3, cancellationCause: null },
        { bookingsAtWindowClose: 6, cancellationCause: null },
      ],
      firstPlanPaymentsCentavos: [],
    });

    expect(pay.lines).toEqual([
      { kind: 'class', detail: '3 alumnas', amountCentavos: 6_500 },
      {
        kind: 'class',
        detail: '6 alumnas, 2 extra',
        amountCentavos: 8_100,
      },
    ]);
    expect(pay.totalCentavos).toBe(14_600);
  });

  it('counts a no-show, because the snapshot already counted her', () => {
    const pay = trainerPay(openingRates, {
      sessions: [{ bookingsAtWindowClose: 5, cancellationCause: null }],
      firstPlanPaymentsCentavos: [],
    });

    expect(pay.lines).toEqual([
      { kind: 'class', detail: '5 alumnas, 1 extra', amountCentavos: 7_300 },
    ]);
  });

  it('pays Bs 25 for a Session cancelled because the minimum was not met', () => {
    const pay = trainerPay(openingRates, {
      sessions: [
        { bookingsAtWindowClose: null, cancellationCause: 'minimum_not_met' },
      ],
      firstPlanPaymentsCentavos: [],
    });

    expect(pay.lines).toEqual([
      {
        kind: 'minimum_not_met',
        detail: 'Mínimo no alcanzado',
        amountCentavos: 2_500,
      },
    ]);
    expect(pay.totalCentavos).toBe(2_500);
  });

  it('pays 10 % of what the first Plan actually paid, once', () => {
    const pay = trainerPay(openingRates, {
      sessions: [],
      firstPlanPaymentsCentavos: [78_000],
    });

    expect(pay.lines).toEqual([
      { kind: 'commission', detail: 'Primer plan', amountCentavos: 7_800 },
    ]);
  });
});
