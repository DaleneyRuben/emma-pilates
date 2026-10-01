import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';
import {
  ClientInvitationNotFoundError,
  InvitationAccessDeniedError,
  InvitationEmailInUseError,
  InvitationEmailThrottledError,
  InvitationHasActivityError,
} from '../src/system-identity/invitations/client-invitations';
import {
  AssistantClientInvitationsController,
  clientInvitationOperations,
} from '../src/system-identity/invitations/client-invitations.controller';

const bearer = `Bearer ${'a'.repeat(43)}`;
const clientId = '11111111-1111-4111-8111-111111111111';
const invitation = {
  clientId,
  name: 'Ana Nueva',
  email: 'ana@example.com',
  phone: '+591 70000000',
  pendingExpiresAt: new Date('2026-10-22T15:00:00.000Z'),
  activationExpiresAt: new Date('2026-09-29T15:00:00.000Z'),
  cancellable: true,
};
const invitationJson = {
  ...invitation,
  pendingExpiresAt: '2026-10-22T15:00:00.000Z',
  activationExpiresAt: '2026-09-29T15:00:00.000Z',
};

describe('assistant client invitations (e2e)', () => {
  let app: INestApplication<App>;
  const assistant: AuthenticatedPrincipal = {
    accountId: 'assistant-account',
    authenticationSessionId: 'session',
    identity: {
      kind: 'staff',
      staffMemberId: 'assistant',
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
    invite: jest.fn<() => Promise<unknown>>(),
    read: jest.fn<() => Promise<unknown>>(),
    correctEmail: jest.fn<() => Promise<unknown>>(),
    resend: jest.fn<() => Promise<unknown>>(),
    cancel: jest.fn<() => Promise<void>>(),
  };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(assistant);
    operations.invite.mockResolvedValue({
      status: 'invited',
      clientId,
      email: 'ana@example.com',
    });
    operations.read.mockResolvedValue(invitation);
    operations.correctEmail.mockResolvedValue({
      ...invitation,
      email: 'nueva@example.com',
    });
    operations.resend.mockResolvedValue(invitation);
    operations.cancel.mockResolvedValue(undefined);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AssistantClientInvitationsController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: clientInvitationOperations, useValue: operations },
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

  it('invites a Client with name, email, and optional phone', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/assistant/client-invitations')
      .set('authorization', bearer)
      .send({ name: 'Ana Nueva', email: 'Ana@Example.com' })
      .expect(201)
      .expect('Cache-Control', 'no-store')
      .expect({ status: 'invited', clientId, email: 'ana@example.com' });
    expect(operations.invite).toHaveBeenCalledWith(
      { name: 'Ana Nueva', email: 'Ana@Example.com', phone: null },
      assistant,
    );

    await request(app.getHttpServer())
      .post('/api/v1/assistant/client-invitations')
      .set('authorization', bearer)
      .send({
        name: 'Ana Nueva',
        email: 'ana@example.com',
        phone: ' +591 70000000 ',
      })
      .expect(201);
    expect(operations.invite).toHaveBeenLastCalledWith(
      expect.objectContaining({ phone: '+591 70000000' }),
      assistant,
    );

    await request(app.getHttpServer())
      .post('/api/v1/assistant/client-invitations')
      .set('authorization', bearer)
      .send({ name: '', email: 'not-an-email' })
      .expect(400)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'invalid_request' }),
      );
  });

  it('reads, corrects, re-sends, and cancels a pending invitation', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/assistant/client-invitations/${clientId}`)
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(invitationJson);
    expect(operations.read).toHaveBeenCalledWith({ clientId }, assistant);

    await request(app.getHttpServer())
      .post(
        `/api/v1/assistant/client-invitations/${clientId}/email-corrections`,
      )
      .set('authorization', bearer)
      .send({ email: 'nueva@example.com' })
      .expect(200)
      .expect({ ...invitationJson, email: 'nueva@example.com' });
    expect(operations.correctEmail).toHaveBeenCalledWith(
      { clientId, email: 'nueva@example.com' },
      assistant,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/assistant/client-invitations/${clientId}/resends`)
      .set('authorization', bearer)
      .expect(200)
      .expect(invitationJson);
    expect(operations.resend).toHaveBeenCalledWith({ clientId }, assistant);

    await request(app.getHttpServer())
      .post(`/api/v1/assistant/client-invitations/${clientId}/cancellation`)
      .set('authorization', bearer)
      .expect(204);
    expect(operations.cancel).toHaveBeenCalledWith({ clientId }, assistant);
  });

  it('maps invitation outcomes to Problem Details', async () => {
    operations.invite.mockRejectedValueOnce(new InvitationEmailInUseError());
    await request(app.getHttpServer())
      .post('/api/v1/assistant/client-invitations')
      .set('authorization', bearer)
      .send({ name: 'Ana', email: 'ana@example.com' })
      .expect(409)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'email_in_use' }),
      );

    operations.invite.mockRejectedValueOnce(
      new InvitationEmailThrottledError(40),
    );
    await request(app.getHttpServer())
      .post('/api/v1/assistant/client-invitations')
      .set('authorization', bearer)
      .send({ name: 'Ana', email: 'ana@example.com' })
      .expect(429)
      .expect('Retry-After', '40')
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'email_throttled' }),
      );

    operations.read.mockRejectedValueOnce(new ClientInvitationNotFoundError());
    await request(app.getHttpServer())
      .get(`/api/v1/assistant/client-invitations/${clientId}`)
      .set('authorization', bearer)
      .expect(404)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'client_invitation_not_found' }),
      );

    operations.cancel.mockRejectedValueOnce(new InvitationHasActivityError());
    await request(app.getHttpServer())
      .post(`/api/v1/assistant/client-invitations/${clientId}/cancellation`)
      .set('authorization', bearer)
      .expect(409)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'invitation_has_activity' }),
      );

    operations.read.mockRejectedValueOnce(new InvitationAccessDeniedError());
    await request(app.getHttpServer())
      .get(`/api/v1/assistant/client-invitations/${clientId}`)
      .set('authorization', bearer)
      .expect(403)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'access_denied' }),
      );

    await request(app.getHttpServer())
      .get('/api/v1/assistant/client-invitations/not-a-uuid')
      .set('authorization', bearer)
      .expect(400);
    await request(app.getHttpServer())
      .get(`/api/v1/assistant/client-invitations/${clientId}`)
      .expect(401);
  });
});
