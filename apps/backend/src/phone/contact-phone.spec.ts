import { buildDevelopmentFixtures } from '../development-fixtures/development-fixtures';
import { isStorableMobile, normalizeContactPhone } from './contact-phone';

describe('normalizeContactPhone', () => {
  it.each([
    ['57007684', '+591 57007684'],
    ['+591 57007684', '+591 57007684'],
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
    expect(normalizeContactPhone(undefined)).toBeNull();
  });

  // FIX-037: a number with its country code is stored «+<code> <digits>».
  it.each([
    ['+54 9 11 1234 5678', '+54 91112345678'],
    ['+51 912-345-678', '+51 912345678'],
    ['+1 201 555 0123', '+1 2015550123'],
    ['+34 612 34 56 78', '+34 612345678'],
  ])('stores the foreign mobile %p as %p', (typed, stored) => {
    expect(normalizeContactPhone(typed)).toBe(stored);
  });

  // An older app still saves, trimmed, as typed.
  it.each(['2 2771234', '22123456', '81234567', '+591 5123456', 'llámame'])(
    'keeps %p as typed when it is no mobile',
    (typed) => {
      expect(normalizeContactPhone(` ${typed} `)).toBe(typed);
    },
  );
});

describe('isStorableMobile', () => {
  it.each([
    '+591 57007684',
    '+591 71234567',
    '+591 61234567',
    '+51 912345678',
    '+54 91123456789',
    '+1 2015550123',
    '+34 612345678',
  ])('accepts %p', (stored) => {
    expect(isStorableMobile(stored)).toBe(true);
  });

  it.each([
    ['+591 22123456', 'a La Paz fixed line'],
    ['+34 912345678', 'a Madrid fixed line'],
    ['+591 5123456', 'seven digits'],
    ['+591 712345678', 'nine digits'],
    ['+591 7123-4567', 'a dash, not the stored shape'],
    ['+59171234567', 'no space after the code'],
    ['71234567', 'no country code'],
    ['+51 12', 'too short'],
    ['', 'empty'],
  ])('refuses %p (%s)', (stored) => {
    expect(isStorableMobile(stored)).toBe(false);
  });

  // The shapes the database holds today: FIX-036's «+591 XXXXXXXX», FIX-037's
  // «+<code> <digits>», and the development fixtures' Clients.
  it('keeps every stored format valid', () => {
    const fixturePhones = buildDevelopmentFixtures({
      today: new Date('2026-11-25T12:00:00Z'),
    }).clients.map((client) => client.phone);
    const stored = [
      ...fixturePhones,
      '+591 70000001',
      '+591 70000005',
      '+591 60012345',
      '+54 91155550000',
      '+51 912345678',
    ];

    expect(fixturePhones.length).toBeGreaterThan(0);
    expect(stored.filter((phone) => !isStorableMobile(phone))).toEqual([]);
    expect(stored.map((phone) => normalizeContactPhone(phone))).toEqual(stored);
  });
});
