import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { BookingAccessDeniedError } from '../src/booking/commands/create-booking';
import { InvoiceFileError } from '../src/booking/payments/invoice-file/invoice-file';
import {
  ClientInvoiceController,
  invoiceFileOperations,
  StaffInvoiceController,
} from '../src/booking/payments/invoice-file/invoice-file.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const paymentId = '22222222-2222-4222-8222-222222222222';
const assetId = '33333333-3333-4333-8333-333333333333';
const uploadedAt = new Date('2026-11-05T14:42:00.000Z');

const view = {
  paymentId,
  clientId: '11111111-1111-4111-8111-111111111111',
  clientName: 'Mariana Quiroga',
  purchaseLabel: 'Paquete de 8 clases',
  amountDueCentavos: 50_200,
  method: 'transfer',
  confirmedAt: uploadedAt,
  voided: false,
  invoiceData: { taxId: '123456', name: 'Mariana Quiroga' },
  invoiceIssued: { issuedAt: uploadedAt, issuedByName: 'Ana Gutiérrez' },
  file: {
    fileName: 'factura-000123.pdf',
    mediaType: 'application/pdf',
    byteSize: 2_048,
    uploadedAt,
    uploadedByName: 'Ana Gutiérrez',
  },
};

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

describe('Invoice file endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const principal: AuthenticatedPrincipal = {
    accountId: 'account-id',
    authenticationSessionId: 'session',
    identity: {
      kind: 'staff',
      staffMemberId: 'staff-id',
      role: 'assistant',
      branchIds: [],
    },
  };
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningful: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const operations = {
    list: operation(),
    read: operation(),
    attach: operation(),
    remove: operation(),
    staffFile: operation(),
    clientList: operation(),
    clientFile: operation(),
    readObject: operation(),
  };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(principal);
    operations.list.mockResolvedValue([view]);
    operations.attach.mockResolvedValue(view);
    operations.remove.mockResolvedValue({ ...view, file: null });
    operations.staffFile.mockResolvedValue({
      objectKey: `private/invoice/${assetId}/document`,
      mediaType: 'application/pdf',
      fileName: 'Factura Mariana Quiroga.pdf',
    });
    operations.readObject.mockResolvedValue(Buffer.from('%PDF-1.7\n%%EOF\n'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StaffInvoiceController, ClientInvoiceController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: invoiceFileOperations, useValue: operations },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('lists the invoices to upload by default, uncached', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/staff/invoices')
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }: { body: { items: { paymentId: string }[] } }) =>
        expect(body.items[0].paymentId).toBe(paymentId),
      );
    expect(operations.list).toHaveBeenCalledWith('pending', principal);

    await request(app.getHttpServer())
      .get('/api/v1/staff/invoices?filter=everything')
      .set('authorization', bearer)
      .expect(400);
  });

  it('attaches a ready upload with the name the device gave it', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/staff/payments/${paymentId}/invoice`)
      .set('authorization', bearer)
      .send({ imageAssetId: assetId, fileName: 'factura-000123.pdf' })
      .expect(200)
      .expect(({ body }: { body: { file: { fileName: string } } }) =>
        expect(body.file.fileName).toBe('factura-000123.pdf'),
      );
    expect(operations.attach).toHaveBeenCalledWith(
      { paymentId, imageAssetId: assetId, fileName: 'factura-000123.pdf' },
      principal,
    );

    await request(app.getHttpServer())
      .put(`/api/v1/staff/payments/${paymentId}/invoice`)
      .set('authorization', bearer)
      .send({ imageAssetId: 'not-a-uuid' })
      .expect(400);
  });

  it.each([
    [new InvoiceFileError('payment_without_invoice_data'), 409],
    [new InvoiceFileError('payment_voided'), 409],
    [new InvoiceFileError('invoice_file_not_attachable'), 409],
    [new InvoiceFileError('payment_not_found'), 404],
  ])('answers %s as a problem', async (error, status) => {
    operations.attach.mockRejectedValueOnce(error);

    await request(app.getHttpServer())
      .put(`/api/v1/staff/payments/${paymentId}/invoice`)
      .set('authorization', bearer)
      .send({ imageAssetId: assetId })
      .expect(status)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe(error.code),
      );
  });

  it('refuses a Role that does not handle invoices', async () => {
    operations.remove.mockRejectedValueOnce(new BookingAccessDeniedError());

    await request(app.getHttpServer())
      .delete(`/api/v1/staff/payments/${paymentId}/invoice`)
      .set('authorization', bearer)
      .expect(403);
  });

  it('downloads the file as an attachment with its own name', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/staff/payments/${paymentId}/invoice/file`)
      .set('authorization', bearer)
      .expect(200)
      .expect('Content-Type', 'application/pdf')
      .expect('Cache-Control', 'no-store')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect(
        'Content-Disposition',
        `attachment; filename="Factura Mariana Quiroga.pdf"; filename*=UTF-8''Factura%20Mariana%20Quiroga.pdf`,
      );
    expect(operations.readObject).toHaveBeenCalledWith(
      `private/invoice/${assetId}/document`,
    );
  });

  it('names the download with the extension of what it serves', async () => {
    operations.staffFile.mockResolvedValueOnce({
      objectKey: `private/invoice/${assetId}/document`,
      mediaType: 'application/pdf',
      fileName: "Factura (O'Brien).html",
    });

    await request(app.getHttpServer())
      .get(`/api/v1/staff/payments/${paymentId}/invoice/file`)
      .set('authorization', bearer)
      .expect(200)
      .expect(
        'Content-Disposition',
        `attachment; filename="Factura (O'Brien).pdf"; filename*=UTF-8''Factura%20%28O%27Brien%29.pdf`,
      );
  });

  it('serves the Client her own list and refuses anonymous callers', async () => {
    operations.clientList.mockResolvedValueOnce([]);

    await request(app.getHttpServer())
      .get('/api/v1/clients/current/invoices')
      .set('authorization', bearer)
      .expect(200)
      .expect({ items: [] });
    await request(app.getHttpServer())
      .get('/api/v1/clients/current/invoices')
      .expect(401);
    await request(app.getHttpServer())
      .get(`/api/v1/clients/current/invoices/not-a-uuid/file`)
      .set('authorization', bearer)
      .expect(400);
  });
});
