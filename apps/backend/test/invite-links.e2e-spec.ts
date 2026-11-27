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
      freeClass: true,
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

  // #26 (owner): a Trainer's link works like a friend's, so her client is
  // attributed to her, but a Trainer's code opens no Guest Pass: the page
  // carries the code without promising a free class.
  it('carries a Trainer code without promising a free class', async () => {
    lookUp.mockResolvedValue({
      code: 'DANIELA',
      status: 'valid',
      holderFirstName: 'Daniela',
      holderKind: 'trainer',
      freeClass: false,
    });

    const iphone = await request(app.getHttpServer())
      .get('/client/invite/DANIELA')
      .set(
        'User-Agent',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X)',
      )
      .expect(200);
    expect(iphone.text).toContain('Daniela te invita a Emma Pilates Studio');
    expect(iphone.text).not.toContain('te regala tu primera clase');
    expect(iphone.text).toContain('>DANIELA<');
    expect(iphone.text).toContain('Copiar código y abrir App Store');

    await request(app.getHttpServer())
      .get('/client/invite/DANIELA')
      .set('User-Agent', 'Mozilla/5.0 (Linux; Android 14)')
      .expect(302)
      .expect(
        'Location',
        'https://play.google.com/store/apps/details?id=com.emmapilates.client&referrer=invite_code%3DDANIELA',
      );
  });

  // Review (testing session): Mariana has never bought a Plan, so her code
  // opens no Guest Pass and the page must not promise one.
  it('promises no free class for a Client code that is not active', async () => {
    lookUp.mockResolvedValue({
      code: 'MARIANA',
      status: 'valid',
      holderFirstName: 'Mariana',
      holderKind: 'client',
      freeClass: false,
    });

    const response = await request(app.getHttpServer())
      .get('/client/invite/MARIANA')
      .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
      .expect(200);
    expect(response.text).toContain('Mariana te invita a Emma Pilates Studio');
    expect(response.text).not.toContain('gratis');
  });

  // CW01c: the page may load its two Google fonts and nothing else.
  it('lets the page load the board fonts', async () => {
    const response = await request(app.getHttpServer())
      .get('/client/invite/LUCIA')
      .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
      .expect(200);
    const policy = response.headers['content-security-policy'];
    expect(policy).toContain(
      "style-src 'unsafe-inline' https://fonts.googleapis.com",
    );
    expect(policy).toContain('font-src https://fonts.gstatic.com');
  });
});
