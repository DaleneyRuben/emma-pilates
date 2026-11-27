import { decideTesterMove, parseMoveParams } from './tester-move';

const today = new Date('2026-11-27T00:00:00.000Z');
const courtesy = {
  subscriptionId: 'courtesy-1',
  planName: 'Plan de cortesía',
  courtesyExtras: 40,
  netExtras: 40,
  lastBookedOn: null,
};
const base = {
  today,
  courtesy,
  inForce: true,
  hasPaidPlan: false,
  saleBlock: null,
  afterBookedClass: false,
  startDateLimitDays: 14,
};

describe('a tester moving to «Trimestral 36 clases»', () => {
  it('sells the Plan from today and removes her unspent courtesy extras', () => {
    expect(decideTesterMove(base)).toEqual({
      action: 'move',
      subscriptionId: 'courtesy-1',
      extrasToRemove: 40,
      startsOn: today,
      afterBookedClassOn: null,
    });
  });

  it('removes only the courtesy extras still unspent', () => {
    expect(
      decideTesterMove({
        ...base,
        courtesy: { ...courtesy, courtesyExtras: 40, netExtras: 12 },
      }),
    ).toMatchObject({ extrasToRemove: 12 });
  });

  it('never removes more than the courtesy extras, nor other extra classes', () => {
    expect(
      decideTesterMove({
        ...base,
        courtesy: { ...courtesy, courtesyExtras: 30, netExtras: 31 },
      }),
    ).toMatchObject({ extrasToRemove: 30 });
    expect(
      decideTesterMove({
        ...base,
        courtesy: { ...courtesy, courtesyExtras: 0, netExtras: 3 },
      }),
    ).toMatchObject({ extrasToRemove: 0 });
  });

  it('skips a Client who already pays and has no courtesy extras left', () => {
    expect(
      decideTesterMove({
        ...base,
        courtesy: { ...courtesy, courtesyExtras: 0, netExtras: 0 },
        hasPaidPlan: true,
      }),
    ).toEqual({ action: 'skip', reason: 'paid_plan' });
  });

  it('still removes the courtesy extras a paying Client kept, after a run stopped between the sale and the removal', () => {
    expect(
      decideTesterMove({ ...base, inForce: false, hasPaidPlan: true }),
    ).toEqual({
      action: 'remove_extras',
      subscriptionId: 'courtesy-1',
      extrasToRemove: 40,
    });
  });

  it('ignores a courtesy Plan that ended, unless a paying Client kept extras on it', () => {
    expect(decideTesterMove({ ...base, inForce: false })).toEqual({
      action: 'ignore',
    });
    expect(
      decideTesterMove({
        ...base,
        courtesy: { ...courtesy, courtesyExtras: 0, netExtras: 0 },
        inForce: false,
        hasPaidPlan: true,
      }),
    ).toEqual({ action: 'ignore' });
  });

  it('holds a tester the sale would refuse, before anything is written', () => {
    expect(
      decideTesterMove({ ...base, saleBlock: 'payment_pending_exists' }),
    ).toEqual({ action: 'blocked', reason: 'payment_pending_exists' });
  });

  it('holds a tester with a class booked ahead, since the sale refuses to strand it', () => {
    const lastBookedOn = new Date('2026-11-29T00:00:00.000Z');

    expect(
      decideTesterMove({ ...base, courtesy: { ...courtesy, lastBookedOn } }),
    ).toEqual({ action: 'blocked', reason: 'booked_class', lastBookedOn });
  });

  it('starts the Plan the day after her last booked class when asked to', () => {
    expect(
      decideTesterMove({
        ...base,
        courtesy: {
          ...courtesy,
          lastBookedOn: new Date('2026-11-29T00:00:00.000Z'),
        },
        afterBookedClass: true,
      }),
    ).toMatchObject({
      action: 'move',
      startsOn: new Date('2026-11-30T00:00:00.000Z'),
      afterBookedClassOn: new Date('2026-11-29T00:00:00.000Z'),
    });
  });

  it('holds her when that day falls past the Start Date limit', () => {
    expect(
      decideTesterMove({
        ...base,
        courtesy: {
          ...courtesy,
          lastBookedOn: new Date('2026-12-11T00:00:00.000Z'),
        },
        afterBookedClass: true,
      }),
    ).toEqual({
      action: 'blocked',
      reason: 'start_date_out_of_window',
      startsOn: new Date('2026-12-12T00:00:00.000Z'),
    });
  });
});

describe('the testers-quarterly-plan params', () => {
  it('needs nothing', () => {
    expect(parseMoveParams({})).toEqual({
      branch: null,
      afterBookedClass: false,
    });
  });

  it('takes a Branch name and the booked-class choice', () => {
    expect(
      parseMoveParams({ branch: ' Achumani ', afterBookedClass: true }),
    ).toEqual({ branch: 'Achumani', afterBookedClass: true });
  });

  it('refuses params of the wrong shape', () => {
    expect(() => parseMoveParams({ branch: 3 })).toThrow('branch_invalid');
    expect(() => parseMoveParams({ afterBookedClass: 'yes' })).toThrow(
      'after_booked_class_invalid',
    );
    expect(() => parseMoveParams({ extra: 1 })).toThrow('params_unknown');
  });
});
