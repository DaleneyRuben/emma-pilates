import { trainerPay, type TrainerPaySession } from './trainer-pay';

// Decisions section 8, in centavos. The opening rates are the ones the
// statement reads; a later PayRateRule must not need a code edit.
const openingRates = {
  classCentavos: 6_500,
  includedStudents: 4,
  extraStudentCentavos: 800,
  minimumNotMetCentavos: 2_500,
  commissionPercent: 10,
};

// Monday 2 November 2026, 10:45 in Bolivia (UTC-4).
const mondayMorning = new Date('2026-11-02T14:45:00.000Z');

const session = (
  bookingsAtWindowClose: number | null,
  cancellationCause: string | null = null,
): TrainerPaySession => ({
  bookingsAtWindowClose,
  cancellationCause,
  startsAt: mondayMorning,
  branchName: 'Sopocachi',
  classTypeName: 'Reformer',
});

describe('trainer pay', () => {
  it('pays Bs 65 for a class of 3 and Bs 65 plus Bs 16 for a class of 6', () => {
    const pay = trainerPay(openingRates, {
      sessions: [session(3), session(6)],
      firstPlans: [],
    });

    expect(pay.lines).toEqual([
      {
        kind: 'class',
        detail: 'lun 2 nov · 10:45 · Sopocachi · Reformer · 3 clientas',
        amountCentavos: 6_500,
      },
      {
        kind: 'class',
        detail:
          'lun 2 nov · 10:45 · Sopocachi · Reformer · 6 clientas, 2 extra',
        amountCentavos: 8_100,
      },
    ]);
    expect(pay.totalCentavos).toBe(14_600);
  });

  it('says «1 clienta» for a class of one', () => {
    const pay = trainerPay(openingRates, {
      sessions: [session(1)],
      firstPlans: [],
    });

    expect(pay.lines[0].detail).toBe(
      'lun 2 nov · 10:45 · Sopocachi · Reformer · 1 clienta',
    );
  });

  it('counts a no-show, because the snapshot already counted her', () => {
    const pay = trainerPay(openingRates, {
      sessions: [session(5)],
      firstPlans: [],
    });

    expect(pay.lines).toEqual([
      {
        kind: 'class',
        detail:
          'lun 2 nov · 10:45 · Sopocachi · Reformer · 5 clientas, 1 extra',
        amountCentavos: 7_300,
      },
    ]);
  });

  it('pays Bs 25 for a Session cancelled because the minimum was not met', () => {
    const pay = trainerPay(openingRates, {
      sessions: [session(null, 'minimum_not_met')],
      firstPlans: [],
    });

    expect(pay.lines).toEqual([
      {
        kind: 'minimum_not_met',
        detail: 'lun 2 nov · 10:45 · Sopocachi · Reformer',
        amountCentavos: 2_500,
      },
    ]);
    expect(pay.totalCentavos).toBe(2_500);
  });

  it('pays 10 % of what the first Plan actually paid, once, naming the Client', () => {
    const pay = trainerPay(openingRates, {
      sessions: [],
      firstPlans: [
        {
          clientName: 'Lucía Mendoza',
          planName: 'Paquete de 8 clases',
          amountDueCentavos: 78_050,
        },
      ],
    });

    expect(pay.lines).toEqual([
      {
        kind: 'commission',
        detail: 'Lucía Mendoza · Paquete de 8 clases · 10 % de Bs 780,50',
        amountCentavos: 7_805,
      },
    ]);
  });
});
