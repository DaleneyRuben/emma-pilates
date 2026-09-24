import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { AdministrationError } from '../src/booking/administration/administration-errors';
import { PromotionError } from '../src/booking/promotions/promotion-rules';
import {
  promotionControllers,
  promotionObjectStorage,
  promotionOperations,
} from '../src/booking/promotions/promotions.controller';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import { authenticatedPrincipalResolver } from '../src/system-identity/authentication/authentication.controller';
import type { AuthenticatedPrincipal } from '../src/system-identity/authentication/resolve-authenticated-principal';

const bearer = `Bearer ${'a'.repeat(43)}`;
const promotionId = '11111111-1111-4111-8111-111111111111';
const imageAssetId = '22222222-2222-4222-8222-222222222222';
const version = '33333333-3333-4333-8333-333333333333';
const key = '44444444-4444-4444-8444-444444444444';
const view = {
  id: promotionId,
  headline: 'Sábados de octubre',
  description: 'Abrimos los sábados por la mañana desde octubre.',
  displayStartsOn: '2026-09-20',
  displayEndsOn: '2026-10-31',
  displayOrder: 0,
  publishedAt: '2026-09-24T19:00:00.000Z',
  state: 'active',
  image: { imageAssetId, width: 2400, height: 1350 },
  updatedAt: '2026-09-24T19:00:00.000Z',
};
const input = {
  headline: view.headline,
  description: view.description,
  displayStartsOn: '2026-09-20',
  displayEndsOn: '2026-10-31',
  imageAssetId,
};

type Operation = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const operation = (): Operation =>
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

describe('promotions (e2e)', () => {
  let app: INestApplication<App>;
  const resolvePrincipal =
    jest.fn<
      (
        credential: string,
        meaningfulActivity: boolean,
      ) => Promise<AuthenticatedPrincipal>
    >();
  const operations = {
    listPromotions: operation(),
    createPromotion: operation(),
    updatePromotion: operation(),
    publishPromotion: operation(),
    unpublishPromotion: operation(),
    archivePromotion: operation(),
    reorderPromotions: operation(),
    readPromotionImage: operation(),
    listActivePromotions: operation(),
    readPublicImage: operation(),
  };
  const storage = { get: jest.fn<() => Promise<Buffer>>() };
  const principal: AuthenticatedPrincipal = {
    accountId: 'admin-account',
    authenticationSessionId: 'session',
    identity: {
      kind: 'staff',
      staffMemberId: 'paola',
      role: 'administrator',
      branchIds: [],
    },
  };

  beforeEach(async () => {
    resolvePrincipal.mockResolvedValue(principal);
    Object.values(operations).forEach((op) => op.mockReset());
    operations.listPromotions.mockResolvedValue([view]);
    operations.createPromotion.mockResolvedValue(view);
    operations.updatePromotion.mockResolvedValue(view);
    operations.publishPromotion.mockResolvedValue(view);
    operations.unpublishPromotion.mockResolvedValue({
      ...view,
      publishedAt: null,
      state: 'draft',
    });
    operations.archivePromotion.mockResolvedValue(undefined);
    operations.reorderPromotions.mockResolvedValue([view]);
    operations.readPromotionImage.mockResolvedValue({
      objectKey: `private/promotion/${imageAssetId}/promotion_480`,
      mediaType: 'image/webp',
    });
    operations.listActivePromotions.mockResolvedValue([
      {
        id: promotionId,
        headline: view.headline,
        description: view.description,
        image: {
          sources: [
            {
              imageAssetId,
              kind: 'promotion_480',
              deliveryVersion: version,
              mediaType: 'image/webp',
              width: 480,
              height: 270,
            },
          ],
        },
      },
    ]);
    operations.readPublicImage.mockResolvedValue({
      objectKey: `public/promotion/${imageAssetId}/promotion_480-${version}`,
      mediaType: 'image/webp',
    });
    storage.get.mockResolvedValue(Buffer.from('webp-bytes'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [...promotionControllers],
      providers: [
        { provide: authenticatedPrincipalResolver, useValue: resolvePrincipal },
        { provide: promotionOperations, useValue: operations },
        { provide: promotionObjectStorage, useValue: storage },
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

  it('lists, creates with an idempotency key, edits, publishes, unpublishes, reorders, and archives', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/administrator/promotions')
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect(({ body }) => {
        expect(body).toEqual([
          {
            ...view,
            image: {
              ...view.image,
              thumbnailUrl: `/api/v1/administrator/promotions/${promotionId}/image?variant=promotion_480`,
            },
          },
        ]);
      });

    await request(app.getHttpServer())
      .post('/api/v1/administrator/promotions')
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .send(input)
      .expect(201);
    expect(operations.createPromotion).toHaveBeenCalledWith(
      {
        ...input,
        displayStartsOn: new Date('2026-09-20T00:00:00.000Z'),
        displayEndsOn: new Date('2026-10-31T00:00:00.000Z'),
      },
      expect.objectContaining({ accountId: 'admin-account' }),
      key,
    );

    await request(app.getHttpServer())
      .post('/api/v1/administrator/promotions')
      .set('authorization', bearer)
      .send(input)
      .expect(400)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'invalid_request' }),
      );

    await request(app.getHttpServer())
      .put(`/api/v1/administrator/promotions/${promotionId}`)
      .set('authorization', bearer)
      .send({ ...input, imageAssetId: null })
      .expect(200);
    expect(operations.updatePromotion).toHaveBeenCalledWith(
      expect.objectContaining({ promotionId, imageAssetId: null }),
      expect.anything(),
    );

    await request(app.getHttpServer())
      .post(`/api/v1/administrator/promotions/${promotionId}/publish`)
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ state: 'active' }));
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/promotions/${promotionId}/unpublish`)
      .set('authorization', bearer)
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ state: 'draft' }));

    await request(app.getHttpServer())
      .put('/api/v1/administrator/promotions/order')
      .set('authorization', bearer)
      .send({ promotionIds: [promotionId] })
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(1));
    expect(operations.reorderPromotions).toHaveBeenCalledWith(
      { promotionIds: [promotionId] },
      expect.anything(),
    );

    await request(app.getHttpServer())
      .delete(`/api/v1/administrator/promotions/${promotionId}`)
      .set('authorization', bearer)
      .expect(204);
    expect(operations.archivePromotion).toHaveBeenCalledWith(
      { promotionId },
      expect.anything(),
    );
  });

  it('rejects bad input and maps the promotion and access codes to problems', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/administrator/promotions')
      .set('authorization', bearer)
      .set('idempotency-key', key)
      .send({ ...input, displayEndsOn: 'mañana' })
      .expect(400)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'invalid_request' }),
      );

    operations.publishPromotion.mockRejectedValue(
      new PromotionError('promotion_image_required'),
    );
    await request(app.getHttpServer())
      .post(`/api/v1/administrator/promotions/${promotionId}/publish`)
      .set('authorization', bearer)
      .expect(409)
      .expect('Content-Type', /application\/problem\+json/)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'promotion_image_required' }),
      );

    operations.listPromotions.mockRejectedValue(
      new AdministrationError('administration_access_denied'),
    );
    await request(app.getHttpServer())
      .get('/api/v1/administrator/promotions')
      .set('authorization', bearer)
      .expect(403)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'administration_access_denied' }),
      );

    await request(app.getHttpServer())
      .get('/api/v1/administrator/promotions')
      .expect(401);
  });

  it('streams a private promotion variant to the Administrator without caching', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/administrator/promotions/${promotionId}/image`)
      .query({ variant: 'promotion_480' })
      .set('authorization', bearer)
      .expect(200)
      .expect('Content-Type', /image\/webp/)
      .expect('Cache-Control', 'no-store')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect(({ body }) =>
        expect(Buffer.from(body as Buffer).toString()).toBe('webp-bytes'),
      );
    expect(operations.readPromotionImage).toHaveBeenCalledWith(
      { promotionId, kind: 'promotion_480' },
      expect.anything(),
    );
    await request(app.getHttpServer())
      .get(`/api/v1/administrator/promotions/${promotionId}/image`)
      .query({ variant: 'readable' })
      .set('authorization', bearer)
      .expect(400);
  });

  it('delivers the active Promotions to a signed-in Account with versioned public image URLs', async () => {
    resolvePrincipal.mockResolvedValue({
      accountId: 'client-account',
      authenticationSessionId: 'session',
      identity: { kind: 'client', clientId: 'lucia' },
    });

    await request(app.getHttpServer())
      .get('/api/v1/promotions')
      .set('authorization', bearer)
      .expect(200)
      .expect('Cache-Control', 'private, no-cache')
      .expect(({ body }) => {
        expect(body).toEqual([
          {
            id: promotionId,
            headline: view.headline,
            description: view.description,
            image: {
              sources: [
                {
                  url: `/api/v1/promotion-images/${imageAssetId}/promotion_480/${version}`,
                  mediaType: 'image/webp',
                  width: 480,
                  height: 270,
                },
              ],
            },
          },
        ]);
      });

    await request(app.getHttpServer()).get('/api/v1/promotions').expect(401);
  });

  it('serves a published image publicly as an immutable asset and 404s anything else', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/promotion-images/${imageAssetId}/promotion_480/${version}`)
      .expect(200)
      .expect('Content-Type', /image\/webp/)
      .expect('Cache-Control', 'public, max-age=31536000, immutable')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect(({ body }) =>
        expect(Buffer.from(body as Buffer).toString()).toBe('webp-bytes'),
      );
    expect(operations.readPublicImage).toHaveBeenCalledWith({
      imageAssetId,
      kind: 'promotion_480',
      deliveryVersion: version,
    });

    operations.readPublicImage.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get(`/api/v1/promotion-images/${imageAssetId}/promotion_480/${version}`)
      .expect(404)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'promotion_image_not_found' }),
      );
    await request(app.getHttpServer())
      .get(`/api/v1/promotion-images/${imageAssetId}/readable/${version}`)
      .expect(404);
  });
});
