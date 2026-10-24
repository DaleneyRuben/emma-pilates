// BKM-011: «¿Cómo nos conociste?» and the Referral Code that decides it
// (Booking ADR-0009). A code wins over the channel she picks: a Client's code
// makes her a friend's recommendation, a Trainer's code the Trainer's.

/** The eight answers a Client or the Assistant can pick. */
export const declaredAcquisitionChannels = [
  'instagram',
  'tiktok',
  'facebook',
  'google',
  'friend',
  'trainer',
  'walk_in',
  'other',
] as const;

export type DeclaredAcquisitionChannel =
  (typeof declaredAcquisitionChannels)[number];

/** `unknown`: registered before the question, or by a build without it. */
export type AcquisitionChannel = DeclaredAcquisitionChannel | 'unknown';

export const acquisitionChannels = [
  ...declaredAcquisitionChannels,
  'unknown',
] as const satisfies readonly AcquisitionChannel[];

export type ReferralCodeHolder =
  | { kind: 'client'; clientId: string }
  | { kind: 'trainer'; staffMemberId: string };

export type ClientAttribution = {
  declaredChannel: AcquisitionChannel;
  channel: AcquisitionChannel;
  referralCode: string | null;
  referrerClientId: string | null;
  referrerStaffMemberId: string | null;
};

export const attributeClient = (input: {
  declaredChannel: AcquisitionChannel;
  referralCode: string | null;
  holder: ReferralCodeHolder | null;
}): ClientAttribution => {
  const { declaredChannel, holder } = input;
  if (input.referralCode === null || holder === null) {
    return {
      declaredChannel,
      channel: declaredChannel,
      referralCode: null,
      referrerClientId: null,
      referrerStaffMemberId: null,
    };
  }
  return holder.kind === 'client'
    ? {
        declaredChannel,
        channel: 'friend',
        referralCode: input.referralCode,
        referrerClientId: holder.clientId,
        referrerStaffMemberId: null,
      }
    : {
        declaredChannel,
        channel: 'trainer',
        referralCode: input.referralCode,
        referrerClientId: null,
        referrerStaffMemberId: holder.staffMemberId,
      };
};

/** Codes are matched upper case, as the registration always did. */
export const normalizeReferralCode = (
  code: string | null | undefined,
): string | null => {
  const normalized = code?.trim().toUpperCase() ?? '';
  return normalized === '' ? null : normalized;
};

/** Every Client's code starts with it, and no Trainer's may. */
export const clientReferralCodePrefix = 'REF-';

const trainerCodePattern = /^[A-Z0-9][A-Z0-9-]{2,19}$/;

/**
 * A Trainer's personal code: 3 to 20 letters, digits, or hyphens, starting
 * with a letter or digit, and never the Client prefix, so the two kinds of
 * code cannot collide.
 */
export const parseTrainerReferralCode = (value: string): string | null => {
  const code = normalizeReferralCode(value);
  if (code === null || !trainerCodePattern.test(code)) return null;
  return code.startsWith(clientReferralCodePrefix) ? null : code;
};
