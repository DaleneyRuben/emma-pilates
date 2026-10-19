import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApplication } from '../src/http/configure-application';
import { ProblemDetailsFilter } from '../src/http/problem-details.filter';
import {
  ADMIN_WEB_ORIGIN,
  LinksController,
} from '../src/links/links.controller';

// ADR-0095: the link host's verification files and browser page.
describe('authentication links (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [LinksController],
      providers: [
        {
          provide: ADMIN_WEB_ORIGIN,
          useValue: 'https://emma-pilates-admin.vercel.app',
        },
        { provide: APP_FILTER, useClass: ProblemDetailsFilter },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the Android asset links as JSON at the host root', async () => {
    const response = await request(app.getHttpServer())
      .get('/.well-known/assetlinks.json')
      .expect('Content-Type', /application\/json/)
      .expect(200);

    expect(
      (response.body as { target: { package_name: string } }[]).map(
        (statement) => statement.target.package_name,
      ),
    ).toContain('com.emmapilates.client');
  });

  it('serves the Apple association as JSON without an extension', () =>
    request(app.getHttpServer())
      .get('/.well-known/apple-app-site-association')
      .expect('Content-Type', /application\/json/)
      .expect(200)
      .expect({ applinks: { details: [] } }));

  it('answers a Client link opened in a browser with a page that keeps the token private', async () => {
    const response = await request(app.getHttpServer())
      .get('/client/authentication/verify-email?token=secret-1')
      .expect('Content-Type', /text\/html/)
      .expect('Cache-Control', 'no-store')
      .expect('Referrer-Policy', 'no-referrer')
      .expect('X-Robots-Tag', 'noindex')
      .expect(200);

    expect(response.headers['content-security-policy']).toBe(
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    expect(response.text).toContain('Emma Pilates');
    expect(response.text).not.toContain('secret-1');
  });

  it('sends a Staff Member on to the admin web from the browser page', async () => {
    const response = await request(app.getHttpServer())
      .get('/staff/authentication/recover-password?token=secret-1')
      .expect(200);

    expect(response.text).toContain(
      'https://emma-pilates-admin.vercel.app/crear-contrasena?token=secret-1',
    );
  });

  it('answers 404 for a link no app claims', () =>
    request(app.getHttpServer())
      .get('/staff/authentication/verify-email?token=secret-1')
      .expect('Content-Type', /application\/problem\+json/)
      .expect(404));

  it('keeps the link host out of the OpenAPI document', async () => {
    const response = await request(app.getHttpServer())
      .get('/openapi.json')
      .expect(200);

    expect(Object.keys((response.body as { paths: object }).paths)).toEqual([]);
  });
});
