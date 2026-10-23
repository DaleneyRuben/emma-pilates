import { Controller } from '@nestjs/common';

export const acquisitionOperations = Symbol('acquisitionOperations');

@Controller({ path: 'administrator/clients', version: '1' })
export class AdministratorClientAcquisitionController {}

@Controller({ path: 'administrator/staff-members', version: '1' })
export class AdministratorTrainerReferralCodeController {}
