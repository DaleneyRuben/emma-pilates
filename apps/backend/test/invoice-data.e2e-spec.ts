import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { AdministrationError } from '../src/booking/administration/administration-errors';
import { BookingAccessDeniedError } from '../src/booking/commands/create-booking';
import { InvoiceDataError } from '../src/booking/payments/invoice-data/invoice-data';
import {
  AdministratorInvoiceIssuedController,
  AssistantInvoiceDataController,
  ClientInvoiceDataController,
  invoiceDataOperations,
} from '../src/booking/payments/invoice-data/invoice-data.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const clientId = '11111111-1111-4111-8111-111111111111';
const paymentId = '22222222-2222-4222-8222-222222222222';
const ana = { taxId: '4567891', name: 'Ana Pérez' };
const issuedAt = new Date('2026-10-23T15:00:00.000Z');

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;

describe('Invoice Data endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const principal: AuthenticatedPrincipal = {
    accountId: 'account-id',
    authenticationSessionId: 'session',
    identity: { kind: 'client', clientId },
  };
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningful: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const operations: Record<
    'readClient' | 'readAssistant' | 'mark' | 'unmark',
    Operation
  > = {
    readClient: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    readAssistant: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    mark: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    unmark: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(principal);
    operations.readClient.mockResolvedValue(ana);
    operations.readAssistant.mockResolvedValue(null);
    operations.mark.mockResolvedValue({
      paymentId,
      invoiceIssued: { issuedAt, issuedByName: 'Paola Mendoza' },
    });
    operations.unmark.mockResolvedValue({ paymentId, invoiceIssued: null });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        ClientInvoiceDataController,
        AssistantInvoiceDataController,
        AdministratorInvoiceIssuedController,
      ],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: invoiceDataOperations, useValue: operations },
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

  it('serves the Client her last Invoice Data, uncached', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/clients/current/invoice-data')
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect({ invoiceData: ana });
    expect(operations.readClient).toHaveBeenCalledWith(principal);

    await request(app.getHttpServer())
      .get('/api/v1/clients/current/invoice-data')
      .expect(401);
  });

  it('serves the front desk a Client’s last Invoice Data, or none', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/assistant/clients/${clientId}/invoice-data`)
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect({ invoiceData: null });
    expect(operations.readAssistant).toHaveBeenCalledWith(
      { clientId },
      principal,
    );

    operations.readAssistant.mockRejectedValueOnce(
      new BookingAccessDeniedError(),
    );
    await request(app.getHttpServer())
      .get(`/api/v1/assistant/clients/${clientId}/invoice-data`)
      .set('authorization', bearer)
      .expect(403)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe('booking_access_denied'),
      );
    await request(app.getHttpServer())
      .get('/api/v1/assistant/clients/not-a-uuid/invoice-data')
      .set('authorization', bearer)
      .expect(400);
  });

  it('marks and unmarks «Factura emitida»', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/payments/${paymentId}/invoice-issued`)
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect({
        paymentId,
        invoiceIssued: {
          issuedAt: issuedAt.toISOString(),
          issuedByName: 'Paola Mendoza',
        },
      });
    expect(operations.mark).toHaveBeenCalledWith({ paymentId }, principal);

    await request(app.getHttpServer())
      .delete(`/api/v1/administrator/payments/${paymentId}/invoice-issued`)
      .set('authorization', bearer)
      .expect(200)
      .expect({ paymentId, invoiceIssued: null });
    expect(operations.unmark).toHaveBeenCalledWith({ paymentId }, principal);
  });

  it.each([
    [new AdministrationError('administration_access_denied'), 403],
    [new InvoiceDataError('payment_not_found'), 404],
    [new InvoiceDataError('payment_not_confirmed'), 409],
  ])('answers %s as a problem', async (error, status) => {
    operations.mark.mockRejectedValueOnce(error);

    await request(app.getHttpServer())
      .post(`/api/v1/administrator/payments/${paymentId}/invoice-issued`)
      .set('authorization', bearer)
      .expect(status)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe(error.code),
      );
  });

  it('refuses a malformed Payment identifier and an anonymous caller', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/administrator/payments/not-a-uuid/invoice-issued')
      .set('authorization', bearer)
      .expect(400);
    await request(app.getHttpServer())
      .delete(`/api/v1/administrator/payments/${paymentId}/invoice-issued`)
      .expect(401);
    expect(operations.mark).not.toHaveBeenCalled();
    expect(operations.unmark).not.toHaveBeenCalled();
  });
});
