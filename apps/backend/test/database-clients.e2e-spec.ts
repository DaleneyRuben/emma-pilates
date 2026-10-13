import { ModulesContainer } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

// ADR-0027 budgets four connections per process, which only holds when every
// module shares the process's one Prisma client and one pg-boss.
const providerInstances = (moduleRef: TestingModule): unknown[] =>
  [...moduleRef.get(ModulesContainer).values()].flatMap((module) =>
    [...module.providers.values()].map((wrapper) => wrapper.instance),
  );

// The generated client is not an instanceof target under the ESM suite, so
// both clients are recognised by shape; pg-boss is the offline stub here.
const isPrismaClient = (instance: unknown): boolean =>
  typeof (instance as { $transaction?: unknown } | null)?.$transaction ===
  'function';

const isPgBoss = (instance: unknown): boolean =>
  !isPrismaClient(instance) &&
  typeof (instance as { stop?: unknown } | null)?.stop === 'function' &&
  Object.keys(instance as object).length === 1;

describe('database clients (e2e)', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('gives every module the same Prisma client', () => {
    const clients = new Set(
      providerInstances(moduleRef).filter(isPrismaClient),
    );

    expect(clients.size).toBe(1);
  });

  it('gives every module the same pg-boss', () => {
    const bosses = new Set(providerInstances(moduleRef).filter(isPgBoss));

    expect(bosses.size).toBe(1);
  });
});
