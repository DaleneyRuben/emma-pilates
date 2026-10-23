// BKM-011: «¿Cómo nos conociste?» and the Referral Code that decides it
// (Booking ADR-0009). Placeholder until the red test is committed.
export type DeclaredAcquisitionChannel = string;
export type AcquisitionChannel = string;
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
}): ClientAttribution => ({
  declaredChannel: input.declaredChannel,
  channel: input.declaredChannel,
  referralCode: null,
  referrerClientId: null,
  referrerStaffMemberId: null,
});

export const normalizeReferralCode = (
  code: string | null | undefined,
): string | null => code ?? null;

export const parseTrainerReferralCode = (value: string): string | null => value;
