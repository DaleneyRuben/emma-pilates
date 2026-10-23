import {
  decideFounderGap,
  decideFounderPlace,
  founderDiscount,
  founderRenewalDeadline,
  isFounder,
} from './founder-membership';

const day = 24 * 60 * 60 * 1_000;
const civil = (date: string): Date => new Date(`${date}T00:00:00.000Z`);

const rules = {
  founderPlaces: 40,
  founderDiscountPercent: 15,
  founderGapDays: 7,
};

describe('founder discount', () => {
  it('takes 15 percent off any Plan except the single class, rounded half up', () => {
    expect(
      founderDiscount({
        classAllowance: 8,
        priceCentavos: 56_000,
        percent: 15,
      }),
    ).toEqual({ discountCentavos: 8_400, amountDueCentavos: 47_600 });
    expect(
      founderDiscount({
        classAllowance: 8,
        priceCentavos: 10_001,
        percent: 15,
      }),
    ).toEqual({ discountCentavos: 1_500, amountDueCentavos: 8_501 });
  });

  it('never discounts the single class', () => {
    expect(
      founderDiscount({
        classAllowance: 1,
        priceCentavos: 8_000,
        percent: 15,
      }),
    ).toEqual({ discountCentavos: 0, amountDueCentavos: 8_000 });
  });
});

describe('founder places', () => {
  it('gives the next number to the first real Payment and stops at 40', () => {
    expect(
      decideFounderPlace({
        places: 40,
        assigned: 39,
        alreadyHeld: false,
        courtesy: false,
      }),
    ).toEqual({ assign: true, number: 40 });
    expect(
      decideFounderPlace({
        places: 40,
        assigned: 40,
        alreadyHeld: false,
        courtesy: false,
      }),
    ).toEqual({ assign: false });
  });

  it('gives Courtesy Access no place and never a second number', () => {
    expect(
      decideFounderPlace({
        places: 40,
        assigned: 3,
        alreadyHeld: false,
        courtesy: true,
      }),
    ).toEqual({ assign: false });
    expect(
      decideFounderPlace({
        places: 40,
        assigned: 3,
        alreadyHeld: true,
        courtesy: false,
      }),
    ).toEqual({ assign: false });
  });
});

describe('founder gap', () => {
  const membership = { status: 'active' as const, lostAt: null };

  it('ends it after more than 7 days and keeps it at 7', () => {
    const today = civil('2026-10-23');
    expect(
      decideFounderGap({
        today,
        rules,
        membership,
        latestRealEnd: new Date(today.getTime() - 8 * day),
        nextStart: null,
      }),
    ).toEqual({ lose: true, reason: 'gap' });
    expect(
      decideFounderGap({
        today,
        rules,
        membership,
        latestRealEnd: new Date(today.getTime() - 7 * day),
        nextStart: null,
      }),
    ).toEqual({ lose: false });
  });

  it('counts from the real end to the next Start Date, and a lost membership stays lost', () => {
    expect(
      decideFounderGap({
        today: civil('2026-11-01'),
        rules,
        membership,
        latestRealEnd: civil('2026-10-20'),
        nextStart: civil('2026-10-28'),
      }),
    ).toEqual({ lose: false });
    expect(
      decideFounderGap({
        today: civil('2026-11-01'),
        rules,
        membership,
        latestRealEnd: civil('2026-10-20'),
        nextStart: civil('2026-10-29'),
      }),
    ).toEqual({ lose: true, reason: 'gap' });
    expect(
      decideFounderGap({
        today: civil('2026-11-01'),
        rules,
        membership: {
          status: 'lost',
          lostAt: civil('2026-10-28'),
        },
        latestRealEnd: civil('2026-10-20'),
        nextStart: civil('2026-10-21'),
      }),
    ).toEqual({ lose: false });
  });
});

describe('founder renewal deadline', () => {
  it('is the real end plus the allowed gap', () => {
    expect(founderRenewalDeadline(civil('2026-10-23'), rules)).toEqual(
      civil('2026-10-30'),
    );
  });
});

describe('isFounder', () => {
  it('is true only while the membership is active', () => {
    expect(isFounder({ status: 'active' })).toBe(true);
    expect(isFounder({ status: 'lost' })).toBe(false);
    expect(isFounder(null)).toBe(false);
  });
});
