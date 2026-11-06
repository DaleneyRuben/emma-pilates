import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../../generated/prisma/client';
import { NOTIFICATION_RECORDER } from '../../../notifications/notification-recorder.provider';
import type { NotificationRecorder } from '../../../notifications/prisma-notification-store';
import { OBJECT_STORAGE } from '../../../uploads/object-storage.module';
import type { ObjectStorage } from '../../../uploads/object-storage';
import {
  attachPaymentInvoice,
  listClientInvoices,
  listStaffInvoices,
  readClientInvoiceFile,
  readPaymentInvoice,
  readPaymentInvoiceFile,
  removePaymentInvoice,
} from './invoice-file';
import {
  ClientInvoiceController,
  invoiceFileOperations,
  StaffInvoiceController,
  type InvoiceFileOperations,
} from './invoice-file.controller';
import { renderPdfPage } from './pdf-page-image';
import { createPrismaInvoiceFile } from './prisma-invoice-file';

// FIX-044's slice, wired here so booking.module.ts gains two lines (the
// invoice-data-wiring pattern).
export const invoiceFileWiring = {
  controllers: [StaffInvoiceController, ClientInvoiceController],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: invoiceFileOperations,
      inject: [prismaToken, NOTIFICATION_RECORDER, OBJECT_STORAGE],
      useFactory: (
        prisma: PrismaClient,
        recordNotification: NotificationRecorder,
        storage: ObjectStorage,
      ): InvoiceFileOperations => {
        const gateway = createPrismaInvoiceFile(prisma, { recordNotification });
        const now = () => new Date();
        return {
          list: (filter, principal) =>
            listStaffInvoices({ filter }, principal, { gateway }),
          read: (paymentId, principal) =>
            readPaymentInvoice({ paymentId }, principal, { gateway }),
          attach: (command, principal) =>
            attachPaymentInvoice(command, principal, { gateway, now }),
          remove: (paymentId, principal) =>
            removePaymentInvoice({ paymentId }, principal, { gateway, now }),
          staffFile: (paymentId, principal) =>
            readPaymentInvoiceFile({ paymentId }, principal, { gateway }),
          clientList: (principal) => listClientInvoices(principal, { gateway }),
          clientFile: (paymentId, principal) =>
            readClientInvoiceFile({ paymentId }, principal, { gateway }),
          readObject: (objectKey) => storage.get(objectKey),
          renderPage: renderPdfPage,
        };
      },
    },
  ],
};
