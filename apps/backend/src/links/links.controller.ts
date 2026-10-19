import { Controller, VERSION_NEUTRAL } from '@nestjs/common';

export const ADMIN_WEB_ORIGIN = Symbol('ADMIN_WEB_ORIGIN');

@Controller({ version: VERSION_NEUTRAL })
export class LinksController {}
