import { isStorableMobile, normalizeContactPhone } from './bolivian-mobile';

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

  // FIX-037: a number with its country code is stored «+<code> <digits>».
  it.each([
    ['+54 9 11 1234 5678', '+54 91112345678'],
    ['+51 912-345-678', '+51 912345678'],
    ['+1 305 555 0123', '+1 3055550123'],
  ])('stores the foreign mobile %p as %p', (typed, stored) => {
    expect(normalizeContactPhone(typed)).toBe(stored);
  });

  // An older app still saves, trimmed, as typed.
  it.each(['2 2771234', '81234567', '+591 5123456'])(
    'keeps %p as typed when it is not a mobile with a country code',
    (typed) => {
      expect(normalizeContactPhone(` ${typed} `)).toBe(typed);
    },
  );
});

describe('isStorableMobile (FIX-037)', () => {
  it.each([
    '+591 71234567',
    '+51 912345678',
    '+54 91123456789',
    '+1 3055550123',
  ])('accepts %p', (stored) => {
    expect(isStorableMobile(stored)).toBe(true);
  });

  it.each(['+591 5123456', '+591 712345678', '81234567', '+51 12', ''])(
    'refuses %p',
    (stored) => {
      expect(isStorableMobile(stored)).toBe(false);
    },
  );
});
