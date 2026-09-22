import { summarizeCredit } from './credit-summary';

describe('summarizeCredit', () => {
  it('starts empty without ledger entries', () => {
    expect(summarizeCredit([])).toEqual({
      availableCentavos: 0,
      reservedCentavos: 0,
    });
  });

  it('holds reserved credit apart from available credit', () => {
    expect(
      summarizeCredit([
        { kind: 'referral_award', amountCentavos: 6000 },
        { kind: 'referral_award', amountCentavos: 6000 },
        { kind: 'payment_reservation', amountCentavos: 4000 },
      ]),
    ).toEqual({ availableCentavos: 8000, reservedCentavos: 4000 });
  });

  it('returns released credit and consumes spent credit', () => {
    const released = summarizeCredit([
      { kind: 'referral_award', amountCentavos: 6000 },
      { kind: 'payment_reservation', amountCentavos: 6000 },
      { kind: 'payment_release', amountCentavos: 6000 },
    ]);
    const spent = summarizeCredit([
      { kind: 'referral_award', amountCentavos: 6000 },
      { kind: 'payment_reservation', amountCentavos: 6000 },
      { kind: 'payment_spend', amountCentavos: 6000 },
    ]);

    expect(released).toEqual({ availableCentavos: 6000, reservedCentavos: 0 });
    expect(spent).toEqual({ availableCentavos: 0, reservedCentavos: 0 });
  });
});
