import { Controller } from '@nestjs/common';

export const ownReferralCodeOperations = Symbol('ownReferralCodeOperations');

@Controller({ path: 'referral-codes', version: '1' })
export class OwnReferralCodeController {}
