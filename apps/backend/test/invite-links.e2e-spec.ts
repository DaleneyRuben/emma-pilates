import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApplication } from '../src/http/configure-application';
import {
  InviteLinksController,
  inviteCodeLookup,
} from '../src/booking/acquisition/invite-links.controller';

// Walkthrough n.º 13: the invite link on the link host.
describe('invite links (e2e)', () => {
  let app: INestApplication<App>;
  const lookUp = jest.fn<(code: string) => Promise<unknown>>();

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [InviteLinksController],
      providers: [{ provide: inviteCodeLookup, useValue: lookUp }],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    lookUp.mockResolvedValue({
      code: 'LUCIA',
      status: 'valid',
      holderFirstName: 'Lucía',
      holderKind: 'client',
    });
  });

  it('redirects Android to Google Play with the code', async () => {
    await request(app.getHttpServer())
      .get('/client/invite/lucia')
      .set('User-Agent', 'Mozilla/5.0 (Linux; Android 14)')
      .expect(302)
      .expect(
        'Location',
        'https://play.google.com/store/apps/details?id=com.emmapilates.client&referrer=invite_code%3DLUCIA',
      );
    expect(lookUp).toHaveBeenCalledWith('lucia');
  });

  it('serves the iPhone page, with its one script allowed', async () => {
    const response = await request(app.getHttpServer())
      .get('/client/invite/LUCIA')
      .set(
        'User-Agent',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X)',
      )
      .expect('Content-Type', /text\/html/)
      .expect(200);

    expect(response.text).toContain('Copiar código y abrir App Store');
    expect(response.headers['content-security-policy']).toContain(
      "script-src 'unsafe-inline'",
    );
  });

  it('treats a Trainer code like a friend’s', async () => {
    lookUp.mockResolvedValue({
      code: 'DANIELA',
      status: 'valid',
      holderFirstName: 'Daniela',
      holderKind: 'trainer',
    });

    const response = await request(app.getHttpServer())
      .get('/client/invite/DANIELA')
      .set('User-Agent', 'Mozilla/5.0 (Macintosh)')
      .expect(200);

    expect(response.text).toContain('Daniela te regala tu primera clase');
  });
});
