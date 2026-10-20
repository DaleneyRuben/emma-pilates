import { Controller } from '@nestjs/common';

export const promotionContactOperations = Symbol('promotionContactOperations');

// Red stub: BE-022 adds the routes next.
@Controller({ path: 'administrator/promotion-contacts', version: '1' })
export class AdministratorPromotionContactsController {}
