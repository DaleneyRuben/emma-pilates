import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { StaffManagementError } from '../src/booking/staff/staff-management';
import { staffManagementOperations } from '../src/booking/staff/staff-management.controller';
import { AdministratorStaffEmailChangeController } from '../src/booking/staff/staff-email-change.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';
import { staffEmailAdmission } from '../src/system-identity/staff-email-budget/staff-email-budget.guard';

const bearer = `Bearer ${'a'.repeat(43)}`;
const staffId = '66666666-6666-4666-8666-666666666666';
const member = {
  id: staffId,
  accountId: '77777777-7777-4777-8777-777777777777',
  name: 'Daniela Ortiz',
  email: 'daniela.ortiz@example.com',
  phone: '+591 70000002',
  role: 'trainer',
  branchIds: [],
  status: 'active',
  activationExpiresAt: null,
  photo: null,
  pendingEmail: null,
};
const pendingEmail = {
  email: 'daniela.nueva@example.com',
  expiresAt: new Date('2026-11-07T15:40:00.000Z'),
};

// FIX-039: the Administrator changes an active Staff Member's login email;
// it waits for the new address to open its link (IDN-008).
describe('administrator staff email change (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const operations = {
    requestEmailChange: jest.fn<() => Promise<unknown>>(),
    resendEmailChange: jest.fn<() => Promise<unknown>>(),
    cancelEmailChange: jest.fn<() => Promise<unknown>>(),
  };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue({
      accountId: 'admin-account',
      authenticationSessionId: 'session',
      identity: {
        kind: 'staff',
        staffMemberId: 'admin',
        role: 'administrator',
        branchIds: [],
      },
    });
    operations.requestEmailChange.mockResolvedValue({
      ...member,
      pendingEmail,
    });
    operations.resendEmailChange.mockResolvedValue({ ...member, pendingEmail });
    operations.cancelEmailChange.mockResolvedValue(member);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AdministratorStaffEmailChangeController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: staffManagementOperations, useValue: operations },
        { provide: staffEmailAdmission, useValue: () => Promise.resolve() },
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

  it('asks for the change and answers the member with the pending address', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/staff-members/${staffId}/email-change`)
      .set('authorization', bearer)
      .send({ email: 'daniela.nueva@example.com' })
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) =>
        expect(body).toMatchObject({
          email: 'daniela.ortiz@example.com',
          pendingEmail: {
            email: 'daniela.nueva@example.com',
            expiresAt: '2026-11-07T15:40:00.000Z',
          },
        }),
      );
    expect(operations.requestEmailChange).toHaveBeenCalledWith(
      { staffMemberId: staffId, email: 'daniela.nueva@example.com' },
      expect.objectContaining({ accountId: 'admin-account' }),
    );

    await request(app.getHttpServer())
      .post(`/api/v1/administrator/staff-members/${staffId}/email-change`)
      .set('authorization', bearer)
      .send({ email: 'not-an-email' })
      .expect(400);
  });

  it('resends and cancels the pending change', async () => {
    await request(app.getHttpServer())
      .post(
        `/api/v1/administrator/staff-members/${staffId}/email-change/resends`,
      )
      .set('authorization', bearer)
      .expect(200);
    expect(operations.resendEmailChange).toHaveBeenCalledWith(
      { staffMemberId: staffId },
      expect.anything(),
    );

    await request(app.getHttpServer())
      .delete(`/api/v1/administrator/staff-members/${staffId}/email-change`)
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ pendingEmail: null }));
  });

  it('maps the refusals to stable codes, with the wait when throttled', async () => {
    const refusals = [
      ['email_in_use', 409],
      ['email_belongs_to_client', 409],
      ['email_unchanged', 400],
      ['staff_member_not_active', 409],
      ['staff_access_denied', 403],
    ] as const;
    for (const [code, status] of refusals) {
      operations.requestEmailChange.mockRejectedValueOnce(
        new StaffManagementError(code),
      );
      await request(app.getHttpServer())
        .post(`/api/v1/administrator/staff-members/${staffId}/email-change`)
        .set('authorization', bearer)
        .send({ email: 'paola@example.com' })
        .expect(status)
        .expect(({ body }) => expect(body).toMatchObject({ code }));
    }

    operations.resendEmailChange.mockRejectedValueOnce(
      new StaffManagementError('email_throttled', 53),
    );
    await request(app.getHttpServer())
      .post(
        `/api/v1/administrator/staff-members/${staffId}/email-change/resends`,
      )
      .set('authorization', bearer)
      .expect(429)
      .expect('Retry-After', '53');

    operations.cancelEmailChange.mockRejectedValueOnce(
      new StaffManagementError('email_change_not_pending'),
    );
    await request(app.getHttpServer())
      .delete(`/api/v1/administrator/staff-members/${staffId}/email-change`)
      .set('authorization', bearer)
      .expect(404)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'email_change_not_pending' }),
      );
  });

  it('requires a bearer credential', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/administrator/staff-members/${staffId}/email-change`)
      .expect(401);
  });
});
