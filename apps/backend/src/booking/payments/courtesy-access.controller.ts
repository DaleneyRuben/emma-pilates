import { Controller } from '@nestjs/common';

export const courtesyAccessGrant = Symbol('courtesyAccessGrant');

@Controller({ path: 'administrator/clients', version: '1' })
export class CourtesyAccessController {}
