import { decideTesterMove, parseMoveParams } from './tester-move';

const today = new Date('2026-11-27T00:00:00.000Z');
const courtesy = {
  subscriptionId: 'courtesy-1',
  planName: 'Plan de cortesía',
  courtesyExtras: 40,
  netExtras: 40,
  lastBookedOn: null,
};

describe('a tester moving to «Trimestral 36 clases»', () => {
  it('removes her unspent courtesy extras and sells the Plan from today', () => {
    expect(
      decideTesterMove({
        today,
        courtesy,
        hasPaidPlan: false,
        afterBookedClass: false,
      }),
    ).toEqual({
      action: 'move',
      subscriptionId: 'courtesy-1',
      extrasToRemove: 40,
      startsOn: today,
    });
  });

  it('removes only the courtesy extras still unspent', () => {
    expect(
      decideTesterMove({
        today,
        courtesy: { ...courtesy, courtesyExtras: 40, netExtras: 12 },
        hasPaidPlan: false,
        afterBookedClass: false,
      }),
    ).toMatchObject({ extrasToRemove: 12 });
  });

  it('leaves other extra classes to the Plan that ends, never removes more than the courtesy ones', () => {
    expect(
      decideTesterMove({
        today,
        courtesy: { ...courtesy, courtesyExtras: 30, netExtras: 31 },
        hasPaidPlan: false,
        afterBookedClass: false,
      }),
    ).toMatchObject({ extrasToRemove: 30 });
    expect(
      decideTesterMove({
        today,
        courtesy: { ...courtesy, courtesyExtras: 0, netExtras: 3 },
        hasPaidPlan: false,
        afterBookedClass: false,
      }),
    ).toMatchObject({ extrasToRemove: 0 });
  });

  it('skips a Client who already has a paid Plan', () => {
    expect(
      decideTesterMove({
        today,
        courtesy,
        hasPaidPlan: true,
        afterBookedClass: false,
      }),
    ).toEqual({ action: 'skip', reason: 'paid_plan' });
  });

  it('holds a tester with a class booked ahead, since the sale refuses to strand it', () => {
    const lastBookedOn = new Date('2026-11-29T00:00:00.000Z');

    expect(
      decideTesterMove({
        today,
        courtesy: { ...courtesy, lastBookedOn },
        hasPaidPlan: false,
        afterBookedClass: false,
      }),
    ).toEqual({ action: 'blocked', reason: 'booked_class', lastBookedOn });
  });

  it('starts the Plan the day after her last booked class when asked to', () => {
    expect(
      decideTesterMove({
        today,
        courtesy: {
          ...courtesy,
          lastBookedOn: new Date('2026-11-29T00:00:00.000Z'),
        },
        hasPaidPlan: false,
        afterBookedClass: true,
      }),
    ).toMatchObject({
      action: 'move',
      startsOn: new Date('2026-11-30T00:00:00.000Z'),
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
