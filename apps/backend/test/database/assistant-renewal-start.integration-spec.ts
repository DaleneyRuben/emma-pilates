import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createAssistantClientOperations } from '../../src/booking/assistant/assistant-operations';
import {
  AssistantClientsController,
  assistantClientOperations,
} from '../../src/booking/assistant/assistant.controller';
import { configureApplication } from '../../src/http/configure-application';
import { ProblemDetailsFilter } from '../../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  fixtures,
  now,
  plan,
  startPaymentWorld,
  type PaymentWorld,
} from './payment-lifecycle-test-support';

const day = 24 * 60 * 60 * 1_000;
const bearer = `Bearer ${'a'.repeat(43)}`;

// FIX-019: the Assistant overview names the fixed renewal start through the
// real composition (assistant-operations), not a stub, so S10 can show it.
describe('assistant overview renewal start (PostgreSQL)', () => {
  let world: PaymentWorld;
  let app: INestApplication<App>;
  let assistant: AuthenticatedPrincipal;

  beforeAll(async () => {
    world = await startPaymentWorld();
    assistant = await world.staffPrincipal('camila.rojas@example.com');
    const moduleFixture = await Test.createTestingModule({
      controllers: [AssistantClientsController],
      providers: [
        {
          provide: authenticatedPrincipalResolver,
          useValue: () => Promise.resolve(assistant),
        },
        {
          provide: assistantClientOperations,
          useValue: createAssistantClientOperations({
            prisma: world.prisma,
            payments: world.commands(),
            now: () => now,
          }),
        },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await world?.stop();
  });

  const buyCash = async (clientId: string) => {
    const centro = fixtures.branches.find(
      (branch) => branch.name === 'Centro',
    )!;
    const sale = await world
      .commands()
      .recordCashPayment(
        { clientId, planId: plan.id, branchId: centro.id },
        assistant,
        randomUUID(),
      );
    return world.prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
  };

  const readOverview = async (clientId: string) => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/assistant/clients/${clientId}`)
      .set('authorization', bearer)
      .expect(200);
    return response.body as {
      subscription: { status: string; renewalStartsOn?: string };
    };
  };

  it('names the day after the current Plan ends while it has classes left', async () => {
    const client = await world.newClient('Con clases');
    const current = await buyCash(client.clientId);

    const body = await readOverview(client.clientId);

    expect(body.subscription.status).toBe('active');
    expect(body.subscription.renewalStartsOn).toBe(
      new Date(current.endsOn.getTime() + day).toISOString().slice(0, 10),
    );
  });

  it('leaves it out when the current Plan has nothing left', async () => {
    const client = await world.newClient('Sin clases');
    const current = await buyCash(client.clientId);
    await world.prisma.subscription.update({
      where: { id: current.id },
      data: { remainingClassAllowance: 0 },
    });

    const body = await readOverview(client.clientId);

    expect(body.subscription).not.toHaveProperty('renewalStartsOn');
  });

  it('leaves it out when a renewal is already queued', async () => {
    const client = await world.newClient('Renovada');
    await buyCash(client.clientId);
    const queued = await buyCash(client.clientId);
    expect(queued.startsOn.getTime()).toBeGreaterThan(now.getTime());

    const body = await readOverview(client.clientId);

    expect(body.subscription).not.toHaveProperty('renewalStartsOn');
  });
});
