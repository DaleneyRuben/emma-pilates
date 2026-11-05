import { normalizeContactPhone } from './bolivian-mobile';

describe('normalizeContactPhone (decision §19.20)', () => {
  it.each([
    ['70000004', '+591 70000004'],
    ['60012345', '+591 60012345'],
    [' 7123 4567 ', '+591 71234567'],
    ['712-34-567', '+591 71234567'],
    ['+591 71234567', '+591 71234567'],
    ['+59171234567', '+591 71234567'],
    ['+591 7123-4567', '+591 71234567'],
  ])('stores the Bolivian mobile %p as %p', (typed, stored) => {
    expect(normalizeContactPhone(typed)).toBe(stored);
  });

  it('keeps a blank phone as none', () => {
    expect(normalizeContactPhone('   ')).toBeNull();
    expect(normalizeContactPhone(null)).toBeNull();
  });

  // An older app or a foreign number still saves, trimmed, as typed.
  it.each(['+54 9 11 1234 5678', '2 2771234', '81234567'])(
    'keeps %p as typed when it is not a Bolivian mobile',
    (typed) => {
      expect(normalizeContactPhone(` ${typed} `)).toBe(typed);
    },
  );
});
