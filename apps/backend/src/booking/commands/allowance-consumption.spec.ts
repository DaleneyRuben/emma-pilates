import { chooseAllowanceSource } from './allowance-consumption';

// BKM-008: a Booking spends the Plan's base allowance first and an extra
// class only once that base is zero. The weekly cap (BKM-007) is not here.
describe('chooseAllowanceSource', () => {
  it('spends the base allowance while any remains', () => {
    expect(
      chooseAllowanceSource({
        remainingClassAllowance: 2,
        extraClasses: 1,
      }),
    ).toBe('base');
  });

  it('spends an extra class only once the base allowance is zero', () => {
    expect(
      chooseAllowanceSource({
        remainingClassAllowance: 0,
        extraClasses: 1,
      }),
    ).toBe('extra');
  });

  it('has nothing to spend when both pools are empty', () => {
    expect(
      chooseAllowanceSource({
        remainingClassAllowance: 0,
        extraClasses: 0,
      }),
    ).toBeNull();
  });
});
