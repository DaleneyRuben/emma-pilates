import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureApplication } from '../../src/http/configure-application';
import { authenticationTokens } from '../../src/system-identity/security/authentication-token-service';
import {
  authorizationMatrix,
  concretePath,
  type Access,
  type RealIds,
} from './authorization-matrix';
import { findRealIds } from './authorization-matrix-support';
import { sampleRequest } from './openapi-samples';
import {
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

const trustedOrigin = 'http://localhost:5186';
const roles = {
  administrator: 'paola.mendoza@example.com',
  coordinator: 'carolina.rivas@example.com',
} as const;
type Role = keyof typeof roles;
const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
type OpenApiDocument = Parameters<typeof sampleRequest>[0];
type Method = (typeof methods)[number];

// IDN-009 / ADR-0102: the authorization matrix over the whole API, booted on
// PostgreSQL with the development fixtures. Each request gets a fresh
// Authentication Session, so a logout row cannot end the next one.
describe('authorization matrix: Administrator and Coordinator', () => {
  let world: EvaluationTestWorld;
  let app: INestApplication<App>;
  let routes: { method: Method; path: string }[];
  let document: OpenApiDocument;
  let realIds: RealIds;

  const credentialFor = async (
    role: Role,
    surface: 'MOBILE' | 'ADMIN_WEB',
  ): Promise<string> => {
    const account = await world.prisma.account.findFirstOrThrow({
      where: { email: roles[role] },
      select: { id: true },
    });
    const { secret, digest } = authenticationTokens.issue();
    const now = new Date();
    await world.prisma.authenticationSession.create({
      data: {
        accountId: account.id,
        surface,
        credentialDigest: new Uint8Array(digest),
        createdAt: now,
        lastMeaningfulActivityAt: now,
        idleExpiresAt: new Date(now.getTime() + 3_600_000),
        absoluteExpiresAt: new Date(now.getTime() + 3_600_000),
      },
    });
    return secret;
  };

  // The admin web's pages reach their endpoints through the browser cookie;
  // the Staff app through its bearer credential.
  const call = async (
    role: Role,
    method: Method,
    path: string,
  ): Promise<number> => {
    const row = authorizationMatrix[`${method.toUpperCase()} ${path}`];
    const sample = sampleRequest(document, method, path);
    const address = `${concretePath(
      path,
      row?.realIds ? realIds : undefined,
      row?.realIds === true ? {} : row?.realIds,
    )}${row?.query ?? sample.query}`;
    const browser =
      path.startsWith('/api/v1/administrator/') ||
      path.startsWith('/api/v1/admin-web/');
    const credential = await credentialFor(
      role,
      browser ? 'ADMIN_WEB' : 'MOBILE',
    );
    let pending = request(app.getHttpServer())
      [method](address)
      .set('Origin', trustedOrigin)
      .set('Idempotency-Key', randomUUID());
    pending = browser
      ? pending.set('Cookie', `__Host-emma-admin-session=${credential}`)
      : pending.set('Authorization', `Bearer ${credential}`);
    if (row?.rawBody) {
      pending = pending
        .set('Content-Type', 'image/png')
        .send(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    } else if (method !== 'get' && method !== 'delete') {
      const body =
        typeof row?.body === 'function' ? row.body(realIds) : row?.body;
      pending = pending.send(body ?? sample.body ?? {});
    }
    try {
      return (await pending.timeout(15_000)).status;
    } catch {
      return 0;
    }
  };

  const outcome = (
    status: number,
    isPublic = false,
  ): Access | `unexpected ${number}` => {
    if (status === 403) return 'deny';
    if (status === 0 || (status === 401 && !isPublic) || status >= 500) {
      return `unexpected ${status}`;
    }
    return 'allow';
  };

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    process.env.DATABASE_URL = world.context.databaseUrl;
    process.env.NODE_ENV = 'test';
    process.env.ADMIN_WEB_TRUSTED_ORIGINS = trustedOrigin;
    // ConfigModule reads the environment when AppModule is first imported.
    const { AppModule } = await import('../../src/app.module.js');
    app = await NestFactory.create<INestApplication<App>>(AppModule, {
      logger: false,
    });
    document = configureApplication(app) as unknown as OpenApiDocument;
    await app.init();
    realIds = await findRealIds(world.prisma);
    routes = Object.entries(document.paths).flatMap(([path, operations]) =>
      methods
        .filter((method) => method in (operations as object))
        .map((method) => ({ method, path })),
    );
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await world?.stop();
  });

  it('lists every endpoint the API serves, and only those', () => {
    const served = routes
      .map(({ method, path }) => `${method.toUpperCase()} ${path}`)
      .sort();
    expect(Object.keys(authorizationMatrix).sort()).toEqual(served);
  });

  const answers = new Map<string, number>();

  it.each(Object.keys(roles) as Role[])(
    'answers the %s as the matrix decides on every endpoint',
    async (role) => {
      const mismatches: string[] = [];
      for (const { method, path } of routes) {
        const key = `${method.toUpperCase()} ${path}`;
        const expected = authorizationMatrix[key]?.[role];
        const status = await call(role, method, path);
        answers.set(`${role} ${key}`, status);
        const row = authorizationMatrix[key];
        if (row?.ownerScoped) {
          if (outcome(status).startsWith('unexpected')) {
            mismatches.push(`${key}: answered ${status}`);
          }
        } else if (outcome(status, row?.public) !== expected) {
          mismatches.push(`${key}: expected ${expected}, answered ${status}`);
        }
      }
      expect(mismatches).toEqual([]);
    },
    300_000,
  );

  // Uploads are authorized by ownership, never by Role: both Roles get the
  // same answer for an upload that is not theirs.
  it('answers owner-scoped endpoints alike for both Roles', () => {
    const differing = Object.entries(authorizationMatrix)
      .filter(([, row]) => row.ownerScoped)
      .filter(
        ([key]) =>
          answers.get(`administrator ${key}`) !==
          answers.get(`coordinator ${key}`),
      )
      .map(([key]) => key);
    expect(differing).toEqual([]);
  });
});
