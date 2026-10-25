import {
  attributeClient,
  normalizeReferralCode,
  parseTrainerReferralCode,
} from './acquisition';

describe('Client attribution (BKM-011)', () => {
  it('keeps the channel she picked when no code is given', () => {
    expect(
      attributeClient({
        declaredChannel: 'instagram',
        referralCode: null,
        holder: null,
      }),
    ).toEqual({
      declaredChannel: 'instagram',
      channel: 'instagram',
      referralCode: null,
      referrerClientId: null,
      referrerStaffMemberId: null,
    });
  });

  it('attributes a Trainer code to the Trainer whatever channel she picked', () => {
    expect(
      attributeClient({
        declaredChannel: 'tiktok',
        referralCode: 'CARLA',
        holder: { kind: 'trainer', staffMemberId: 'trainer-id' },
      }),
    ).toEqual({
      declaredChannel: 'tiktok',
      channel: 'trainer',
      referralCode: 'CARLA',
      referrerClientId: null,
      referrerStaffMemberId: 'trainer-id',
    });
  });

  it('attributes a Client code to the friend, even for an older build that sent no channel', () => {
    expect(
      attributeClient({
        declaredChannel: 'unknown',
        referralCode: 'REF-LUCIA',
        holder: { kind: 'client', clientId: 'lucia-id' },
      }),
    ).toEqual({
      declaredChannel: 'unknown',
      channel: 'friend',
      referralCode: 'REF-LUCIA',
      referrerClientId: 'lucia-id',
      referrerStaffMemberId: null,
    });
  });

  it('normalizes a typed code and treats a blank one as no code', () => {
    expect(normalizeReferralCode('  carla ')).toBe('CARLA');
    expect(normalizeReferralCode('   ')).toBeNull();
    expect(normalizeReferralCode(undefined)).toBeNull();
    expect(normalizeReferralCode(null)).toBeNull();
  });

  it.each([
    ['carla', 'CARLA'],
    [' Emma-2026 ', 'EMMA-2026'],
    ['ABC', 'ABC'],
  ])('accepts the personal code %p as %p', (typed, stored) => {
    expect(parseTrainerReferralCode(typed)).toBe(stored);
  });

  it.each([
    ['AB', 'too short'],
    ['A'.repeat(21), 'too long'],
    ['REF-CARLA', 'the Client code prefix'],
    ['CAR LA', 'a space'],
    ['-CARLA', 'a leading hyphen'],
    ['CARLÁ', 'an accent'],
  ])('refuses the personal code %p (%s)', (typed) => {
    expect(parseTrainerReferralCode(typed)).toBeNull();
  });
});
