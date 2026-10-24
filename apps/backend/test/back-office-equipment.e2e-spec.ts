import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { BackOfficeError } from '../src/back-office/back-office-errors';
import { backOfficeOperations } from '../src/back-office/back-office-http';
import { equipmentControllers } from '../src/back-office/equipment/equipment.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';

const bearer = `Bearer ${'a'.repeat(43)}`;
const branchId = '22222222-2222-4222-8222-222222222222';
const equipmentId = '11111111-1111-4111-8111-111111111111';
const issueId = '33333333-3333-4333-8333-333333333333';
const sessionId = '44444444-4444-4444-8444-444444444444';
const reformer = {
  id: equipmentId,
  branchId,
  kind: 'reformer',
  number: 5,
  status: 'out_of_service',
  openIssueCount: 1,
  archivedAt: null,
};
const issue = {
  id: issueId,
  equipmentId,
  equipmentKind: 'reformer',
  equipmentNumber: 5,
  description: 'El resorte rojo se soltó.',
  outOfService: true,
  reportedAt: '2026-10-22T12:10:00.000Z',
  reportedByName: 'Emma Vargas',
  resolvedAt: null,
  resolvedByName: null,
};

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

// BKO-004: AW37's Equipment and faults, AW02's flags, and S26's report.
describe('equipment endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const equipment = {
    listEquipment: operation(),
    createEquipment: operation(),
    archiveEquipment: operation(),
    reportIssue: operation(),
    resolveIssue: operation(),
    listIssues: operation(),
    listFlaggedSessions: operation(),
  };
  const sessionEquipment = {
    listSessionEquipment: operation(),
    reportSessionIssue: operation(),
  };

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: equipmentControllers,
      providers: [
        {
          provide: authenticatedPrincipalResolver,
          useValue: () =>
            Promise.resolve({
              accountId: 'account',
              authenticationSessionId: 'session',
              identity: {
                kind: 'staff',
                staffMemberId: 'staff',
                role: 'administrator',
                branchIds: [],
              },
            }),
        },
        {
          provide: backOfficeOperations,
          useValue: { equipment, sessionEquipment },
        },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.resetAllMocks();
  });

  const server = () => request(app.getHttpServer());

  it('lists, registers, and retires a Branch’s Equipment without caching', async () => {
    equipment.listEquipment.mockResolvedValue({ items: [reformer] });
    await server()
      .get(`/api/v1/administrator/equipment?branchId=${branchId}`)
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) => expect(body).toEqual({ items: [reformer] }));
    expect(equipment.listEquipment).toHaveBeenCalledWith(
      { branchId },
      expect.anything(),
    );

    equipment.createEquipment.mockResolvedValue(reformer);
    await server()
      .post('/api/v1/administrator/equipment')
      .set('authorization', bearer)
      .send({ branchId, kind: 'reformer', number: 5 })
      .expect(201);
    expect(equipment.createEquipment).toHaveBeenCalledWith(
      { branchId, kind: 'reformer', number: 5 },
      expect.anything(),
    );

    equipment.archiveEquipment.mockResolvedValue(reformer);
    await server()
      .post(`/api/v1/administrator/equipment/${equipmentId}/archive`)
      .set('authorization', bearer)
      .expect(200);
    expect(equipment.archiveEquipment).toHaveBeenCalledWith(
      { equipmentId },
      expect.anything(),
    );
  });

  it.each([
    ['a kind it does not know', { branchId, kind: 'barre', number: 1 }],
    ['number 0', { branchId, kind: 'mat', number: 0 }],
    ['number 100', { branchId, kind: 'mat', number: 100 }],
    ['no Branch', { kind: 'mat', number: 1 }],
  ])('refuses %s as invalid_request', async (_case, body) => {
    await server()
      .post('/api/v1/administrator/equipment')
      .set('authorization', bearer)
      .send(body)
      .expect(400)
      .expect(({ body: problem }: { body: { code: string } }) =>
        expect(problem.code).toBe('invalid_request'),
      );
    expect(equipment.createEquipment).not.toHaveBeenCalled();
  });

  it('answers a taken number and a refused role as problems', async () => {
    equipment.createEquipment.mockRejectedValue(
      new BackOfficeError('equipment_number_taken'),
    );
    await server()
      .post('/api/v1/administrator/equipment')
      .set('authorization', bearer)
      .send({ branchId, kind: 'reformer', number: 5 })
      .expect(409)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe('equipment_number_taken'),
      );
    equipment.listEquipment.mockRejectedValue(
      new BackOfficeError('back_office_access_denied'),
    );
    await server()
      .get(`/api/v1/administrator/equipment?branchId=${branchId}`)
      .set('authorization', bearer)
      .expect(403);
  });

  it('records, lists, and resolves faults', async () => {
    equipment.reportIssue.mockResolvedValue(issue);
    await server()
      .post(`/api/v1/administrator/equipment/${equipmentId}/issues`)
      .set('authorization', bearer)
      .send({ description: 'El resorte rojo se soltó.', outOfService: true })
      .expect(201)
      .expect(({ body }) => expect(body).toEqual(issue));
    expect(equipment.reportIssue).toHaveBeenCalledWith(
      {
        equipmentId,
        description: 'El resorte rojo se soltó.',
        outOfService: true,
      },
      expect.anything(),
    );
    await server()
      .post(`/api/v1/administrator/equipment/${equipmentId}/issues`)
      .set('authorization', bearer)
      .send({ description: ' ', outOfService: true })
      .expect(400);

    equipment.listIssues.mockResolvedValue({
      items: [issue],
      page: 1,
      pageSize: 20,
      totalItems: 1,
    });
    await server()
      .get(`/api/v1/administrator/equipment-issues?branchId=${branchId}`)
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store');
    expect(equipment.listIssues).toHaveBeenCalledWith(
      { branchId, status: 'open', page: 1, pageSize: 20 },
      expect.anything(),
    );

    equipment.resolveIssue.mockRejectedValue(
      new BackOfficeError('equipment_issue_resolved'),
    );
    await server()
      .post(`/api/v1/administrator/equipment-issues/${issueId}/resolve`)
      .set('authorization', bearer)
      .expect(409);
    expect(equipment.resolveIssue).toHaveBeenCalledWith(
      { issueId },
      expect.anything(),
    );
  });

  it('lists the flagged Sessions of a bounded range', async () => {
    const from = '2026-10-19T04:00:00.000Z';
    const until = '2026-10-26T04:00:00.000Z';
    equipment.listFlaggedSessions.mockResolvedValue([
      { sessionId, kind: 'reformer', capacity: 8, workingCount: 7 },
    ]);
    await server()
      .get(
        `/api/v1/administrator/equipment-flags?branchId=${branchId}&from=${from}&until=${until}`,
      )
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual([
          { sessionId, kind: 'reformer', capacity: 8, workingCount: 7 },
        ]),
      );
    expect(equipment.listFlaggedSessions).toHaveBeenCalledWith(
      { branchId, from: new Date(from), until: new Date(until) },
      expect.anything(),
    );
    await server()
      .get(
        `/api/v1/administrator/equipment-flags?branchId=${branchId}&from=${until}&until=${from}`,
      )
      .set('authorization', bearer)
      .expect(400);
  });

  it('lets a Trainer list her Session’s Equipment and report a fault on it', async () => {
    sessionEquipment.listSessionEquipment.mockResolvedValue({
      sessionId,
      kind: 'reformer',
      items: [reformer],
    });
    await server()
      .get(`/api/v1/trainer/sessions/${sessionId}/equipment`)
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }: { body: { kind: string } }) =>
        expect(body.kind).toBe('reformer'),
      );
    sessionEquipment.reportSessionIssue.mockResolvedValue(issue);
    await server()
      .post(`/api/v1/trainer/sessions/${sessionId}/equipment-issues`)
      .set('authorization', bearer)
      .send({
        equipmentId,
        description: 'El resorte rojo se soltó.',
        outOfService: true,
      })
      .expect(201);
    expect(sessionEquipment.reportSessionIssue).toHaveBeenCalledWith(
      {
        sessionId,
        equipmentId,
        description: 'El resorte rojo se soltó.',
        outOfService: true,
      },
      expect.anything(),
    );
    await server()
      .post(`/api/v1/trainer/sessions/not-a-uuid/equipment-issues`)
      .set('authorization', bearer)
      .send({ equipmentId, description: 'x', outOfService: false })
      .expect(400);
  });
});
