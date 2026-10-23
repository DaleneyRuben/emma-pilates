import { Controller } from '@nestjs/common';

export const invoiceDataOperations = Symbol('invoiceDataOperations');

@Controller({ path: 'clients/current/invoice-data', version: '1' })
export class ClientInvoiceDataController {}

@Controller({ path: 'assistant/clients', version: '1' })
export class AssistantInvoiceDataController {}

@Controller({ path: 'administrator/payments', version: '1' })
export class AdministratorInvoiceIssuedController {}
