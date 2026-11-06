import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { BookingAccessDeniedError } from '../src/booking/commands/create-booking';
import {
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
  const operations: Record<'readClient' | 'readAssistant', Operation> = {
    readClient: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    readAssistant: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(principal);
    operations.readClient.mockResolvedValue(ana);
    operations.readAssistant.mockResolvedValue(null);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        ClientInvoiceDataController,
        AssistantInvoiceDataController,
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

  // FIX-044 (owner, 2026-11-05): a payment is «Factura emitida» only by
  // uploading the invoice, so the plain mark is no longer served.
  it('no longer serves the plain «Factura emitida» mark', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/payments/${paymentId}/invoice-issued`)
      .set('authorization', bearer)
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/api/v1/administrator/payments/${paymentId}/invoice-issued`)
      .set('authorization', bearer)
      .expect(404);
  });
});
