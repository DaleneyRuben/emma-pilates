import { hasSpendableExtra, netAllowanceClasses } from './net-allowance';

// H13: a spent extra class is a grant of +1 and a consumption of -1. The net
// sum is what a Client can still spend, not the existence of a grant.
describe('net allowance', () => {
  it('treats a spent gift as nothing left to spend', () => {
    const spent = [{ classes: 1 }, { classes: -1 }];

    expect(netAllowanceClasses(spent)).toBe(0);
    expect(hasSpendableExtra(spent)).toBe(false);
  });

  it('keeps an unspent gift available', () => {
    expect(hasSpendableExtra([{ classes: 1 }])).toBe(true);
  });

  it('keeps a second gift available after one was spent', () => {
    expect(
      hasSpendableExtra([{ classes: 1 }, { classes: 1 }, { classes: -1 }]),
    ).toBe(true);
  });
});
