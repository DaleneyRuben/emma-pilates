import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import type { OpenAPIObject } from '@nestjs/swagger';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  AdministratorStaffMembersController,
  staffManagementOperations,
} from '../src/booking/staff/staff-management.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import {
  AuthenticationRequiredError,
  type AuthenticatedPrincipal,
} from '../src/system-identity/authentication/resolve-authenticated-principal';
import { InvitationEmailThrottledError } from '../src/system-identity/invitations/client-invitations';
import {
  AssistantClientInvitationsController,
  clientInvitationOperations,
} from '../src/system-identity/invitations/client-invitations.controller';
import { StaffEmailThrottledError } from '../src/system-identity/staff-email-budget/admit-staff-email-request';
import { staffEmailAdmission } from '../src/system-identity/staff-email-budget/staff-email-budget.guard';

type Admission = (command: {
  accountId: string;
  purpose: 'activation' | 'verification';
}) => Promise<void>;

const bearer = `Bearer ${'a'.repeat(43)}`;
const clientId = '11111111-1111-4111-8111-111111111111';
const staffMemberId = '22222222-2222-4222-8222-222222222222';
const branchId = '33333333-3333-4333-8333-333333333333';

const endpoints = [
  {
    operationId: 'inviteClient',
    path: '/api/v1/assistant/client-invitations',
    operation: 'invite',
    purpose: 'activation',
    body: { name: 'Ana Nueva', email: 'ana@example.com' },
  },
  {
    operationId: 'correctClientInvitationEmail',
    path: `/api/v1/assistant/client-invitations/${clientId}/email-corrections`,
    operation: 'correctEmail',
    purpose: 'activation',
    body: { email: 'ana.nueva@example.com' },
  },
  {
    operationId: 'resendClientInvitation',
    path: `/api/v1/assistant/client-invitations/${clientId}/resends`,
    operation: 'resend',
    purpose: 'activation',
    body: {},
  },
  {
    operationId: 'sendClientVerification',
    path: `/api/v1/assistant/client-invitations/${clientId}/verification-emails`,
    operation: 'sendVerification',
    purpose: 'verification',
    body: {},
  },
  {
    operationId: 'createStaffMember',
    path: '/api/v1/administrator/staff-members',
    operation: 'create',
    purpose: 'activation',
    body: {
      name: 'Rocío Paz',
      email: 'rocio.paz@example.com',
      role: 'trainer',
      branchIds: [branchId],
    },
  },
  {
    operationId: 'resendStaffMemberActivation',
    path: `/api/v1/administrator/staff-members/${staffMemberId}/activation-link`,
    operation: 'resendActivation',
    purpose: 'activation',
    body: {},
  },
  {
    operationId: 'correctStaffMemberEmail',
    path: `/api/v1/administrator/staff-members/${staffMemberId}/email-corrections`,
    operation: 'correctStaffEmail',
    purpose: 'activation',
    body: { email: 'rocio.p@example.com' },
  },
] as const;

describe('staff email budget (e2e)', () => {
  let app: INestApplication<App>;
  let document: OpenAPIObject;
  const principal: AuthenticatedPrincipal = {
    accountId: 'staff-account',
    authenticationSessionId: 'session',
    identity: {
      kind: 'staff',
      staffMemberId: 'staff',
      role: 'administrator',
      branchIds: [],
    },
  };
  const admit = jest.fn<Admission>(() => Promise.resolve());
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningful: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const done = () => jest.fn<() => Promise<unknown>>(() => Promise.resolve({}));
  const invitations = {
    invite: done(),
    read: done(),
    correctEmail: done(),
    resend: done(),
    sendVerification: done(),
    cancel: done(),
  };
  const staff = {
    list: done(),
    read: done(),
    create: done(),
    resendActivation: done(),
    changeRole: done(),
    changeBranches: done(),
    deactivate: done(),
    correctEmail: done(),
    cancelInvitation: done(),
  };
  const operationOf = (name: (typeof endpoints)[number]['operation']) =>
    name === 'correctStaffEmail'
      ? staff.correctEmail
      : name in invitations
        ? invitations[name as keyof typeof invitations]
        : staff[name as keyof typeof staff];

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(principal);
    const module = await Test.createTestingModule({
      controllers: [
        AssistantClientInvitationsController,
        AdministratorStaffMembersController,
      ],
      providers: [
        { provide: staffEmailAdmission, useValue: admit },
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: clientInvitationOperations, useValue: invitations },
        { provide: staffManagementOperations, useValue: staff },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();
    app = module.createNestApplication();
    document = configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it.each(endpoints)(
    'admits $operationId under the signed-in Account before running it',
    async ({ path, operation, purpose, body }) => {
      await request(app.getHttpServer())
        .post(path)
        .set('authorization', bearer)
        .send(body)
        .expect(({ status }) => expect(status).toBeLessThan(300));

      expect(admit).toHaveBeenCalledWith({
        accountId: 'staff-account',
        purpose,
      });
      // The guard does not count as session activity; the handler does.
      expect(
        resolvePrincipal.mock.calls.map(([, meaningful]) => meaningful),
      ).toEqual([false, true]);
      expect(operationOf(operation)).toHaveBeenCalledTimes(1);
    },
  );

  it.each(endpoints)(
    'answers a full Account budget on $operationId with 429 and Retry-After',
    async ({ path, operation, body }) => {
      admit.mockRejectedValueOnce(new StaffEmailThrottledError(75));

      await request(app.getHttpServer())
        .post(path)
        .set('authorization', bearer)
        .send(body)
        .expect(429)
        .expect('Retry-After', '75')
        .expect('Content-Type', /application\/problem\+json/)
        .expect(({ body: problem }) =>
          expect(problem).toMatchObject({
            status: 429,
            code: 'staff_email_throttled',
            detail:
              'Too many emails were requested from this Account. Try again later',
          }),
        );

      expect(operationOf(operation)).not.toHaveBeenCalled();
    },
  );

  it('lets a request without a valid credential reach the handler’s 401 uncounted', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/assistant/client-invitations/${clientId}/resends`)
      .expect(401);
    resolvePrincipal.mockRejectedValue(new AuthenticationRequiredError());
    await request(app.getHttpServer())
      .post(
        `/api/v1/administrator/staff-members/${staffMemberId}/activation-link`,
      )
      .set('authorization', bearer)
      .expect(401);

    expect(admit).not.toHaveBeenCalled();
  });

  it('keeps the recipient lane’s email_throttled after an admitted request', async () => {
    invitations.resend.mockRejectedValueOnce(
      new InvitationEmailThrottledError(40),
    );

    await request(app.getHttpServer())
      .post(`/api/v1/assistant/client-invitations/${clientId}/resends`)
      .set('authorization', bearer)
      .expect(429)
      .expect('Retry-After', '40')
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'email_throttled' }),
      );
    expect(admit).toHaveBeenCalledTimes(1);
  });

  it('does not budget invitation cancellation', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/assistant/client-invitations/${clientId}/cancellation`)
      .set('authorization', bearer)
      .expect(204);

    expect(admit).not.toHaveBeenCalled();
  });

  it('documents the 429 on the seven budgeted operations only', () => {
    const limited = Object.values(document.paths).flatMap((item) =>
      Object.values(
        item as Record<string, { operationId?: string; responses?: object }>,
      )
        .filter(
          (operation) => operation.responses && '429' in operation.responses,
        )
        .map((operation) => operation.operationId),
    );

    expect(limited.sort()).toEqual(
      endpoints.map(({ operationId }) => operationId).sort(),
    );
  });
});
