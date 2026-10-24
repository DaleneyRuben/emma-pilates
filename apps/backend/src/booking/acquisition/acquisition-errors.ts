// BKM-011's stable Problem Details codes. `referral_code_invalid` and
// `referral_self_reference` keep the status registration always answered.
const statuses = {
  referral_code_invalid: 400,
  referral_self_reference: 400,
  referral_code_malformed: 400,
  acquisition_access_denied: 403,
  client_not_found: 404,
  staff_member_not_found: 404,
  staff_member_not_trainer: 409,
  referral_code_in_use: 409,
} as const;

export type AcquisitionErrorCode = keyof typeof statuses;

const details: Record<AcquisitionErrorCode, string> = {
  referral_code_invalid: 'Unknown referral code',
  referral_self_reference: 'A Client cannot refer themselves',
  referral_code_malformed:
    'A personal code has 3 to 20 letters, digits, or hyphens and cannot start with REF-',
  acquisition_access_denied:
    'Correcting how a Client found the studio is not allowed for this Role',
  client_not_found: 'Client not found',
  staff_member_not_found: 'Staff Member not found',
  staff_member_not_trainer: 'Only a Trainer holds a personal code',
  referral_code_in_use: 'Another Client or Trainer already holds this code',
};

export class AcquisitionError extends Error {
  readonly status: number;

  constructor(readonly code: AcquisitionErrorCode) {
    super(details[code]);
    this.name = 'AcquisitionError';
    this.status = statuses[code];
  }
}

export type AcquisitionProblem = {
  code: AcquisitionErrorCode;
  detail: string;
  status: number;
};

export const acquisitionProblem = (
  error: unknown,
): AcquisitionProblem | null =>
  error instanceof AcquisitionError
    ? { code: error.code, detail: error.message, status: error.status }
    : null;
