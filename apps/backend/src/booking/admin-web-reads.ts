import type { Provider } from '@nestjs/common';
import { administratorClientProvider } from './clients/administrator-client-operations';
import { AdministratorClientsController } from './clients/administrator-clients.controller';
import { AdministratorPaymentListController } from './payments/administrator-payment-list.controller';
import { administratorPaymentProvider } from './payments/administrator-payment-operations';
import { CourtesyAccessController } from './payments/courtesy-access.controller';
import { courtesyAccessProvider } from './payments/courtesy-access-provider';

// The admin web's oversight reads (WEB-004 Clients, WEB-005 Payments) and the
// Client detail's «Acceso de prueba» grant (REL-011), wired here so
// booking.module.ts, already past the file-size limit, stays put.
export const adminWebReads = {
  controllers: [
    AdministratorClientsController,
    AdministratorPaymentListController,
    CourtesyAccessController,
  ],
  providers: (prismaToken: symbol): Provider[] => [
    administratorClientProvider(prismaToken),
    administratorPaymentProvider(prismaToken),
    courtesyAccessProvider(prismaToken),
  ],
};
