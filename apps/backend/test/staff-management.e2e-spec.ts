import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { StaffManagementError } from '../src/booking/staff/staff-management';
import {
  AdministratorStaffMembersController,
  staffManagementOperations,
} from '../src/booking/staff/staff-management.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';
import { staffEmailAdmission } from '../src/system-identity/staff-email-budget/staff-email-budget.guard';

const bearer = `Bearer ${'a'.repeat(43)}`;
const staffId = '66666666-6666-4666-8666-666666666666';
const centro = '11111111-1111-4111-8111-111111111111';
const member = {
  id: staffId,
  accountId: '77777777-7777-4777-8777-777777777777',
  name: 'Rocío Paz',
  email: 'rocio.paz@example.com',
  phone: null,
  role: 'trainer',
  branchIds: [centro],
  status: 'pending',
  activationExpiresAt: new Date('2026-09-30T12:00:00.000Z'),
};

describe('administrator staff members (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const operations = {
    list: jest.fn<() => Promise<unknown>>(),
    read: jest.fn<() => Promise<unknown>>(),
    create: jest.fn<() => Promise<unknown>>(),
    resendActivation: jest.fn<() => Promise<unknown>>(),
    changeRole: jest.fn<() => Promise<unknown>>(),
    changeBranches: jest.fn<() => Promise<unknown>>(),
    deactivate: jest.fn<() => Promise<unknown>>(),
    correctEmail: jest.fn<() => Promise<unknown>>(),
    cancelInvitation: jest.fn<() => Promise<void>>(),
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
    operations.list.mockResolvedValue({
      items: [member],
      page: 2,
      pageSize: 10,
      totalItems: 11,
    });
    operations.read.mockResolvedValue(member);
    operations.create.mockResolvedValue(member);
    operations.resendActivation.mockResolvedValue(member);
    operations.changeRole.mockResolvedValue({ ...member, role: 'assistant' });
    operations.changeBranches.mockResolvedValue(member);
    operations.deactivate.mockResolvedValue({
      ...member,
      status: 'deactivated',
    });
    operations.correctEmail.mockResolvedValue({
      ...member,
      email: 'rocio.p@example.com',
    });
    operations.cancelInvitation.mockResolvedValue(undefined);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AdministratorStaffMembersController],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: staffManagementOperations, useValue: operations },
        // BE-013's Account budget admits everything here.
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

  it('lists Staff Members with allowlisted filters and page-and-offset paging', async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v1/administrator/staff-members?page=2&pageSize=10&role=trainer&branchId=${centro}&status=pending`,
      )
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) => {
        expect(body).toEqual({
          items: [
            { ...member, activationExpiresAt: '2026-09-30T12:00:00.000Z' },
          ],
          page: 2,
          pageSize: 10,
          totalItems: 11,
        });
      });
    expect(operations.list).toHaveBeenCalledWith(
      {
        page: 2,
        pageSize: 10,
        role: 'trainer',
        branchId: centro,
        status: 'pending',
      },
      expect.objectContaining({ accountId: 'admin-account' }),
    );

    await request(app.getHttpServer())
      .get('/api/v1/administrator/staff-members?role=owner')
      .set('authorization', bearer)
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('invalid_request'));
    await request(app.getHttpServer())
      .get('/api/v1/administrator/staff-members?pageSize=101')
      .set('authorization', bearer)
      .expect(400);
  });

  it('creates a Staff Member and validates the body', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/administrator/staff-members')
      .set('authorization', bearer)
      .send({
        name: 'Rocío Paz',
        email: 'rocio.paz@example.com',
        role: 'trainer',
        branchIds: [centro],
      })
      .expect(201)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) =>
        expect(body).toMatchObject({ id: staffId, status: 'pending' }),
      );
    expect(operations.create).toHaveBeenCalledWith(
      {
        name: 'Rocío Paz',
        email: 'rocio.paz@example.com',
        phone: null,
        role: 'trainer',
        branchIds: [centro],
      },
      expect.anything(),
    );

    await request(app.getHttpServer())
      .post('/api/v1/administrator/staff-members')
      .set('authorization', bearer)
      .send({ name: '', email: 'not-an-email', role: 'trainer', branchIds: [] })
      .expect(400);
  });

  it('maps staff rules to stable problem codes', async () => {
    const cases: [string, number][] = [
      ['staff_access_denied', 403],
      ['staff_member_not_found', 404],
      ['email_in_use', 409],
      ['trainer_has_upcoming_sessions', 409],
      ['last_administrator', 409],
      ['own_staff_member', 409],
      ['staff_member_deactivated', 409],
      ['staff_member_not_pending', 409],
      ['invalid_branch_assignment', 400],
      ['email_throttled', 429],
      ['email_belongs_to_client', 409],
      ['email_unchanged', 400],
    ];
    for (const [code, status] of cases) {
      operations.deactivate.mockRejectedValueOnce(
        new StaffManagementError(
          code as ConstructorParameters<typeof StaffManagementError>[0],
        ),
      );
      await request(app.getHttpServer())
        .post(`/api/v1/administrator/staff-members/${staffId}/deactivation`)
        .set('authorization', bearer)
        .expect(status)
        .expect(({ body }) => expect(body.code).toBe(code));
    }
  });

  it('reads, resends, changes the Role and Branches of, and deactivates a Staff Member', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/administrator/staff-members/${staffId}`)
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store');
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/staff-members/${staffId}/activation-link`)
      .set('authorization', bearer)
      .expect(200);
    await request(app.getHttpServer())
      .put(`/api/v1/administrator/staff-members/${staffId}/role`)
      .set('authorization', bearer)
      .send({ role: 'assistant' })
      .expect(200)
      .expect(({ body }) => expect(body.role).toBe('assistant'));
    expect(operations.changeRole).toHaveBeenCalledWith(
      { staffMemberId: staffId, role: 'assistant' },
      expect.anything(),
    );
    await request(app.getHttpServer())
      .put(`/api/v1/administrator/staff-members/${staffId}/branches`)
      .set('authorization', bearer)
      .send({ branchIds: [centro] })
      .expect(200);
    expect(operations.changeBranches).toHaveBeenCalledWith(
      { staffMemberId: staffId, branchIds: [centro] },
      expect.anything(),
    );
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/staff-members/${staffId}/deactivation`)
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('deactivated'));
    await request(app.getHttpServer())
      .get('/api/v1/administrator/staff-members/not-a-uuid')
      .set('authorization', bearer)
      .expect(400);
  });

  it('corrects and cancels a pending invitation (WEB-012)', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/staff-members/${staffId}/email-corrections`)
      .set('authorization', bearer)
      .send({ email: 'rocio.p@example.com' })
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }: { body: { email: string } }) =>
        expect(body.email).toBe('rocio.p@example.com'),
      );
    expect(operations.correctEmail).toHaveBeenCalledWith(
      { staffMemberId: staffId, email: 'rocio.p@example.com' },
      expect.anything(),
    );
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/staff-members/${staffId}/email-corrections`)
      .set('authorization', bearer)
      .send({ email: 'not-an-email' })
      .expect(400);

    await request(app.getHttpServer())
      .post(
        `/api/v1/administrator/staff-members/${staffId}/invitation-cancellation`,
      )
      .set('authorization', bearer)
      .expect(204);
    expect(operations.cancelInvitation).toHaveBeenCalledWith(
      { staffMemberId: staffId },
      expect.anything(),
    );
  });

  it('says when a limited email can be sent again and when an invitation reopened', async () => {
    operations.resendActivation.mockRejectedValueOnce(
      new StaffManagementError('email_throttled', 40),
    );
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/staff-members/${staffId}/activation-link`)
      .set('authorization', bearer)
      .expect(429)
      .expect('Retry-After', '40');

    operations.create.mockResolvedValueOnce({
      ...member,
      invitationReopened: true,
    });
    await request(app.getHttpServer())
      .post('/api/v1/administrator/staff-members')
      .set('authorization', bearer)
      .send({
        name: 'Rocío Paz',
        email: 'rocio.paz@example.com',
        role: 'trainer',
        branchIds: [centro],
      })
      .expect(201)
      .expect(({ body }: { body: { invitationReopened?: boolean } }) =>
        expect(body.invitationReopened).toBe(true),
      );
  });

  it('requires a bearer credential', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/administrator/staff-members')
      .expect(401);
  });
});
