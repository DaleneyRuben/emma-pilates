import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { AdministrationError } from '../src/booking/administration/administration-errors';
import type {
  StudioSettingsOperations,
  StudioSettingsView,
} from '../src/booking/studio-settings/prisma-studio-settings';
import { StudioSettingsError } from '../src/booking/studio-settings/studio-settings';
import {
  studioSettingsControllers,
  studioSettingsOperations,
} from '../src/booking/studio-settings/studio-settings.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const adminPath = '/api/v1/administrator/studio-settings';
const rulesPath = '/api/v1/studio-rules';

const view: StudioSettingsView = {
  version: 3,
  cancellationWindowMinutes: 150,
  minimumBookings: 2,
  minimumBookingsCheckLeadMinutes: 180,
  startDateLimitDays: 14,
  founderPlaces: 40,
  founderDiscountPercent: 15,
  founderGapDays: 7,
  guestPassesPerClient: 1,
  invitesPerHostPerMonth: 1,
  inviteRewardClasses: 1,
  taxRatePercent: 16,
  evaluationPriceCentavos: 7_000,
  nutritionistFeeCentavos: 5_000,
  renewalTargetMonths1To6Percent: 80,
  renewalTargetMonths7To12Percent: 85,
  renewalTargetFromMonth13Percent: 90,
  openingDate: '2026-12-01',
  updatedAt: new Date('2026-10-23T15:00:00.000Z'),
  updatedByName: 'Paola Rivero',
};

const body = {
  expectedVersion: 3,
  minimumBookings: 3,
  taxRatePercent: 16,
  renewalTargetMonths1To6Percent: 80,
  renewalTargetMonths7To12Percent: 85,
  renewalTargetFromMonth13Percent: 90,
  openingDate: null,
};

describe('studio settings (e2e)', () => {
  let app: INestApplication<App>;
  const bearer = `Bearer ${'a'.repeat(43)}`;
  const administrator: AuthenticatedPrincipal = {
    accountId: 'account-id',
    authenticationSessionId: 'session-id',
    identity: {
      kind: 'staff',
      staffMemberId: 'staff-id',
      role: 'administrator',
      branchIds: [],
    },
  };
  const resolvePrincipal =
    jest.fn<(credential: string) => Promise<AuthenticatedPrincipal>>();
  const operations = {
    read: jest.fn<StudioSettingsOperations['read']>(),
    update: jest.fn<StudioSettingsOperations['update']>(),
    rules: jest.fn<StudioSettingsOperations['rules']>(),
  };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(administrator);
    Object.values(operations).forEach((operation) => operation.mockReset());
    operations.read.mockResolvedValue(view);
    operations.update.mockResolvedValue({ ...view, version: 4 });
    operations.rules.mockResolvedValue({
      cancellationWindowMinutes: 150,
      evaluationPriceCentavos: 7_000,
      plansFromPriceCentavos: 8_000,
      startDateLimitDays: 14,
      openingDate: null,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [...studioSettingsControllers],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: studioSettingsOperations, useValue: operations },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('answers the public rules without a credential, cached briefly', async () => {
    await request(app.getHttpServer())
      .get(rulesPath)
      .expect(200)
      .expect('cache-control', 'public, max-age=60')
      .expect({
        cancellationWindowMinutes: 150,
        evaluationPriceCentavos: 7000,
        plansFromPriceCentavos: 8000,
        startDateLimitDays: 14,
        openingDate: null,
      });
    expect(resolvePrincipal).not.toHaveBeenCalled();
  });

  it('reads every setting for the Administrator without caching', async () => {
    await request(app.getHttpServer())
      .get(adminPath)
      .set('authorization', bearer)
      .expect(200)
      .expect('cache-control', 'no-store')
      .expect({ ...view, updatedAt: '2026-10-23T15:00:00.000Z' });
    expect(operations.read).toHaveBeenCalledWith(administrator);
  });

  it('saves the configurable values against the version the form read', async () => {
    await request(app.getHttpServer())
      .put(adminPath)
      .set('authorization', bearer)
      .send(body)
      .expect(200)
      .expect('cache-control', 'no-store')
      .expect(({ body: saved }: { body: { version: number } }) =>
        expect(saved.version).toBe(4),
      );
    const { expectedVersion, ...values } = body;
    expect(operations.update).toHaveBeenCalledWith(
      { expectedVersion, values },
      administrator,
    );
  });

  it.each([
    {},
    { ...body, minimumBookings: '3' },
    { ...body, openingDate: 'mañana' },
    { ...body, cancellationWindowMinutes: 240 },
  ])('refuses the body %j', async (invalid) => {
    await request(app.getHttpServer())
      .put(adminPath)
      .set('authorization', bearer)
      .send(invalid)
      .expect(400)
      .expect(({ body: problem }: { body: { code: string } }) =>
        expect(problem.code).toBe('invalid_request'),
      );
    expect(operations.update).not.toHaveBeenCalled();
  });

  it.each([
    [new AdministrationError('administration_access_denied'), 403],
    [new StudioSettingsError('studio_settings_version_conflict'), 409],
    [new StudioSettingsError('invalid_studio_setting'), 400],
  ])('answers %s with %i', async (error, status) => {
    operations.update.mockRejectedValue(error);
    await request(app.getHttpServer())
      .put(adminPath)
      .set('authorization', bearer)
      .send(body)
      .expect(status)
      .expect(({ body: problem }: { body: { code: string } }) =>
        expect(problem.code).toBe(error.code),
      );
  });

  it('requires a credential for the Administrator routes', async () => {
    await request(app.getHttpServer()).get(adminPath).expect(401);
    await request(app.getHttpServer()).put(adminPath).send(body).expect(401);
  });
});
