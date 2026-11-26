import {
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Res,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import type { ReferralCodeLookup } from './referral-code-lookup';
import { inviteLinkDestination } from './invite-link-page';

export const inviteCodeLookup = Symbol('inviteCodeLookup');

// The page prints only the code and a first name, and runs one inline script
// (copy the code, then open the App Store).
const pageSecurityPolicy =
  "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

// Walkthrough n.º 13: a hosting path on the link host, like the
// authentication fallback pages, so it stays out of OpenAPI.
@ApiExcludeController()
@Controller({ version: VERSION_NEUTRAL })
export class InviteLinksController {
  constructor(
    @Inject(inviteCodeLookup)
    private readonly lookUp: (code: string) => Promise<ReferralCodeLookup>,
  ) {}

  @Get('client/invite/:code')
  async invite(
    @Param('code') code: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const found = await this.lookUp(code).catch(() => null);
    const destination = inviteLinkDestination({
      userAgent: userAgent ?? '',
      invite:
        // Only a Client's code opens a Guest Pass (BKM-014): a Trainer's
        // leads to the stores without promising a free class.
        found?.status === 'valid' &&
        found.holderKind === 'client' &&
        found.holderFirstName !== null
          ? { code: found.code, holderFirstName: found.holderFirstName }
          : null,
    });
    response.setHeader('Cache-Control', 'no-store');
    if (destination.kind === 'redirect') {
      response.redirect(302, destination.location);
      return;
    }
    response
      .status(200)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .setHeader('Content-Security-Policy', pageSecurityPolicy)
      .setHeader('Referrer-Policy', 'no-referrer')
      .send(destination.html);
  }
}
