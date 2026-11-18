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
const typeId = '55555555-5555-4555-8555-555555555555';
const issueId = '33333333-3333-4333-8333-333333333333';
const sessionId = '44444444-4444-4444-8444-444444444444';
const balones = {
  id: typeId,
  name: 'Balones',
  tracking: 'quantity',
  legacyKind: null,
};
const stock = {
  typeId,
  typeName: 'Balones',
  branchId,
  quantity: 12,
  damaged: 1,
  usable: 11,
};
const damage = {
  id: issueId,
  equipmentId: null,
  equipmentKind: null,
  equipmentNumber: null,
  typeId,
  typeName: 'Balones',
  quantity: 1,
  writtenOff: false,
  description: 'Pinchado',
  outOfService: false,
  reportedAt: '2026-11-18T12:10:00.000Z',
  reportedByName: 'Paola Mendoza',
  resolvedAt: null,
  resolvedByName: null,
};

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

// FIX-067: studio-defined types, counted stock and its damage.
describe('equipment type and stock endpoints (e2e)', () => {
  let app: INestApplication<App>;
  const equipment = { createEquipment: operation() };
  const equipmentTypes = {
    listTypes: operation(),
    createType: operation(),
    renameType: operation(),
    archiveType: operation(),
  };
  const equipmentStocks = {
    listStocks: operation(),
    setStockQuantity: operation(),
    reportStockDamage: operation(),
    writeOffIssue: operation(),
  };
  const sessionEquipment = { reportSessionIssue: operation() };

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
          useValue: {
            equipment,
            equipmentTypes,
            equipmentStocks,
            sessionEquipment,
          },
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

  it('lists, creates, renames, and archives types', async () => {
    equipmentTypes.listTypes.mockResolvedValue({ items: [balones] });
    await server()
      .get('/api/v1/administrator/equipment-types')
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) => expect(body).toEqual({ items: [balones] }));

    equipmentTypes.createType.mockResolvedValue(balones);
    await server()
      .post('/api/v1/administrator/equipment-types')
      .set('authorization', bearer)
      .send({ name: ' Balones ', tracking: 'quantity', branchId, quantity: 12 })
      .expect(201)
      .expect(({ body }) => expect(body).toEqual(balones));
    expect(equipmentTypes.createType).toHaveBeenCalledWith(
      { name: 'Balones', tracking: 'quantity', branchId, quantity: 12 },
      expect.anything(),
    );

    equipmentTypes.renameType.mockResolvedValue(balones);
    await server()
      .patch(`/api/v1/administrator/equipment-types/${typeId}`)
      .set('authorization', bearer)
      .send({ name: 'Pelotas' })
      .expect(200);
    expect(equipmentTypes.renameType).toHaveBeenCalledWith(
      { typeId, name: 'Pelotas' },
      expect.anything(),
    );

    equipmentTypes.archiveType.mockRejectedValue(
      new BackOfficeError('equipment_type_in_use'),
    );
    await server()
      .post(`/api/v1/administrator/equipment-types/${typeId}/archive`)
      .set('authorization', bearer)
      .expect(409)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe('equipment_type_in_use'),
      );
    expect(equipmentTypes.archiveType).toHaveBeenCalledWith(
      { typeId },
      expect.anything(),
    );
  });

  it.each([
    ['an unknown tracking', { name: 'Bosu', tracking: 'pair' }],
    ['a name of 41 characters', { name: 'x'.repeat(41), tracking: 'unit' }],
    [
      'a quantity on a unit type',
      { name: 'Bosu', tracking: 'unit', branchId, quantity: 2 },
    ],
    [
      'a quantity without a Branch',
      { name: 'Bosu', tracking: 'quantity', quantity: 2 },
    ],
    [
      'a quantity of 10000',
      { name: 'Bosu', tracking: 'quantity', branchId, quantity: 10_000 },
    ],
  ])('refuses a type with %s', async (_case, body) => {
    await server()
      .post('/api/v1/administrator/equipment-types')
      .set('authorization', bearer)
      .send(body)
      .expect(400);
    expect(equipmentTypes.createType).not.toHaveBeenCalled();
  });

  it('answers a taken name as a problem', async () => {
    equipmentTypes.renameType.mockRejectedValue(
      new BackOfficeError('equipment_type_name_taken'),
    );
    await server()
      .patch(`/api/v1/administrator/equipment-types/${typeId}`)
      .set('authorization', bearer)
      .send({ name: 'Mat' })
      .expect(409)
      .expect(({ body }: { body: { code: string } }) =>
        expect(body.code).toBe('equipment_type_name_taken'),
      );
  });

  it('registers a unit by type id or by the old kind, not both', async () => {
    equipment.createEquipment.mockResolvedValue({});
    await server()
      .post('/api/v1/administrator/equipment')
      .set('authorization', bearer)
      .send({ branchId, typeId, number: 3 })
      .expect(201);
    expect(equipment.createEquipment).toHaveBeenCalledWith(
      { branchId, typeId, number: 3 },
      expect.anything(),
    );
    await server()
      .post('/api/v1/administrator/equipment')
      .set('authorization', bearer)
      .send({ branchId, typeId, kind: 'mat', number: 3 })
      .expect(400);
    equipment.createEquipment.mockRejectedValue(
      new BackOfficeError('equipment_type_not_unit'),
    );
    await server()
      .post('/api/v1/administrator/equipment')
      .set('authorization', bearer)
      .send({ branchId, typeId, number: 3 })
      .expect(409);
  });

  it('lists and sets a Branch’s stock and records and writes off damage', async () => {
    equipmentStocks.listStocks.mockResolvedValue({ items: [stock] });
    await server()
      .get(`/api/v1/administrator/equipment-stocks?branchId=${branchId}`)
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) => expect(body).toEqual({ items: [stock] }));
    expect(equipmentStocks.listStocks).toHaveBeenCalledWith(
      { branchId },
      expect.anything(),
    );

    equipmentStocks.setStockQuantity.mockRejectedValue(
      new BackOfficeError('equipment_quantity_below_damaged'),
    );
    await server()
      .put('/api/v1/administrator/equipment-stocks')
      .set('authorization', bearer)
      .send({ branchId, typeId, quantity: 0 })
      .expect(409);
    expect(equipmentStocks.setStockQuantity).toHaveBeenCalledWith(
      { branchId, typeId, quantity: 0 },
      expect.anything(),
    );
    await server()
      .put('/api/v1/administrator/equipment-stocks')
      .set('authorization', bearer)
      .send({ branchId, typeId, quantity: 1.5 })
      .expect(400);

    equipmentStocks.reportStockDamage.mockResolvedValue(damage);
    await server()
      .post('/api/v1/administrator/equipment-stocks/damage')
      .set('authorization', bearer)
      .send({ branchId, typeId, quantity: 1, description: ' Pinchado ' })
      .expect(201)
      .expect(({ body }) => expect(body).toEqual(damage));
    expect(equipmentStocks.reportStockDamage).toHaveBeenCalledWith(
      { branchId, typeId, quantity: 1, description: 'Pinchado' },
      expect.anything(),
    );
    await server()
      .post('/api/v1/administrator/equipment-stocks/damage')
      .set('authorization', bearer)
      .send({ branchId, typeId, quantity: 0, description: 'Pinchado' })
      .expect(400);

    equipmentStocks.writeOffIssue.mockResolvedValue({
      ...damage,
      writtenOff: true,
    });
    await server()
      .post(`/api/v1/administrator/equipment-issues/${issueId}/write-off`)
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }: { body: { writtenOff: boolean } }) =>
        expect(body.writtenOff).toBe(true),
      );
    expect(equipmentStocks.writeOffIssue).toHaveBeenCalledWith(
      { issueId },
      expect.anything(),
    );
  });

  it('lets a Trainer report damage on a counted type from her Session', async () => {
    sessionEquipment.reportSessionIssue.mockResolvedValue(damage);
    await server()
      .post(`/api/v1/trainer/sessions/${sessionId}/equipment-issues`)
      .set('authorization', bearer)
      .send({ typeId, quantity: 2, description: 'Pinchados' })
      .expect(201);
    expect(sessionEquipment.reportSessionIssue).toHaveBeenCalledWith(
      { sessionId, typeId, quantity: 2, description: 'Pinchados' },
      expect.anything(),
    );
    await server()
      .post(`/api/v1/trainer/sessions/${sessionId}/equipment-issues`)
      .set('authorization', bearer)
      .send({ typeId, quantity: 2, description: 'x', outOfService: true })
      .expect(400);
  });
});
