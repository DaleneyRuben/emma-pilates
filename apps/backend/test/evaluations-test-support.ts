import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import type { App } from 'supertest/types';
import {
  ClientEvaluationsController,
  evaluationCommands,
  EvaluationSlotsController,
} from '../src/booking/evaluations/evaluations.controller';
import {
  NutritionistAvailabilityBlocksController,
  NutritionistEvaluationsController,
} from '../src/booking/evaluations/nutritionist.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

export const bearer = `Bearer ${'a'.repeat(43)}`;
export const key = '11111111-1111-4111-8111-111111111111';
export const slotId = '22222222-2222-4222-8222-222222222222';
export const evaluationId = '33333333-3333-4333-8333-333333333333';
export const blockId = '44444444-4444-4444-8444-444444444444';
export const branchId = '55555555-5555-4555-8555-555555555555';
export const civil = (date: string) => new Date(`${date}T00:00:00.000Z`);

export const slot = {
  id: slotId,
  startsAt: new Date('2026-09-28T13:45:00.000Z'),
  endsAt: new Date('2026-09-28T14:30:00.000Z'),
  durationMinutes: 45,
  branchId,
  branchName: 'Centro',
  nutritionistName: 'Gabriela Flores',
  bookable: true,
};
export const evaluation = {
  id: evaluationId,
  slotId,
  state: 'booked',
  startsAt: slot.startsAt,
  endsAt: slot.endsAt,
  durationMinutes: 45,
  branchId,
  branchName: 'Centro',
  nutritionistName: 'Gabriela Flores',
  cancellableUntil: new Date('2026-09-28T10:45:00.000Z'),
  cancellable: true,
};
export const block = {
  id: blockId,
  branchId,
  branchName: 'Centro',
  weekday: 1,
  startsAtLocal: '09:00',
  endsAtLocal: '13:00',
  effectiveFrom: civil('2026-09-21'),
  effectiveUntil: null,
  slotsPerWeek: 5,
  upcomingBookedCount: 1,
};

export const principal: AuthenticatedPrincipal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client', clientId: 'client-id' },
};

type CommandDouble = jest.Mock<(...args: unknown[]) => Promise<unknown>>;

export type PrincipalResolverDouble = jest.Mock<
  (
    credential: string,
    meaningfulActivity: boolean,
  ) => Promise<AuthenticatedPrincipal>
>;

export const principalResolverDouble = (): PrincipalResolverDouble =>
  jest.fn<
    (
      credential: string,
      meaningfulActivity: boolean,
    ) => Promise<AuthenticatedPrincipal>
  >();

export type EvaluationCommandDoubles = {
  listBookableSlots: CommandDouble;
  readEvaluationSlot: CommandDouble;
  bookEvaluation: CommandDouble;
  listClientEvaluations: CommandDouble;
  cancelClientEvaluation: CommandDouble;
  listNutritionistAgenda: CommandDouble;
  cancelEvaluationAsStaff: CommandDouble;
  listAvailabilityBlocks: CommandDouble;
  createAvailabilityBlock: CommandDouble;
  replaceAvailabilityBlock: CommandDouble;
  endAvailabilityBlock: CommandDouble;
};

export const evaluationCommandDoubles = (): EvaluationCommandDoubles => ({
  listBookableSlots: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  readEvaluationSlot: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  bookEvaluation: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  listClientEvaluations: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  cancelClientEvaluation: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  listNutritionistAgenda: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  cancelEvaluationAsStaff: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  listAvailabilityBlocks: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  createAvailabilityBlock: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  replaceAvailabilityBlock: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  endAvailabilityBlock: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
});

// The happy-path answers every evaluation route spec starts from.
export const primeEvaluationCommands = (
  commands: EvaluationCommandDoubles,
  resolvePrincipal: PrincipalResolverDouble,
): void => {
  resolvePrincipal.mockResolvedValue(principal);
  commands.listBookableSlots.mockResolvedValue({
    days: [{ date: civil('2026-09-28'), slots: [slot] }],
    months: [
      {
        month: civil('2026-09-01'),
        status: 'used',
        evaluation: { id: evaluationId, startsAt: slot.startsAt },
      },
      { month: civil('2026-10-01'), status: 'available', evaluation: null },
    ],
  });
  commands.readEvaluationSlot.mockResolvedValue(slot);
  commands.bookEvaluation.mockResolvedValue(evaluation);
  commands.listClientEvaluations.mockResolvedValue({
    items: [evaluation],
    hasMore: false,
    nextCursor: null,
  });
  commands.cancelClientEvaluation.mockResolvedValue(undefined);
  commands.listNutritionistAgenda.mockResolvedValue({
    items: [
      {
        evaluationId,
        clientName: 'Lucía Fernández',
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        durationMinutes: 45,
        branchId,
        branchName: 'Centro',
        kind: 'first',
      },
    ],
    hasMore: true,
    nextCursor: 'next-page',
  });
  commands.cancelEvaluationAsStaff.mockResolvedValue(undefined);
  commands.listAvailabilityBlocks.mockResolvedValue([block]);
  commands.createAvailabilityBlock.mockResolvedValue(block);
  commands.replaceAvailabilityBlock.mockResolvedValue({
    ended: { ...block, effectiveUntil: civil('2026-10-05') },
    replacement: {
      ...block,
      id: '66666666-6666-4666-8666-666666666666',
      startsAtLocal: '10:00',
      effectiveFrom: civil('2026-10-05'),
      slotsPerWeek: 4,
      upcomingBookedCount: 0,
    },
    withdrawnSlots: 14,
    keptEvaluations: 1,
  });
  commands.endAvailabilityBlock.mockResolvedValue({
    block: { ...block, effectiveUntil: civil('2026-10-12') },
    withdrawnSlots: 8,
    keptEvaluations: 2,
  });
};

export const startEvaluationsApp = async (
  commands: EvaluationCommandDoubles,
  resolvePrincipal: PrincipalResolverDouble,
): Promise<INestApplication<App>> => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    controllers: [
      EvaluationSlotsController,
      ClientEvaluationsController,
      NutritionistEvaluationsController,
      NutritionistAvailabilityBlocksController,
    ],
    providers: [
      { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
      { provide: evaluationCommands, useValue: commands },
      { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    ],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApplication(app);
  await app.init();
  return app;
};
