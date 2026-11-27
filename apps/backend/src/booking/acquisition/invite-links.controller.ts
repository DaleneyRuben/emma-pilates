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
import type { InviteCodeLookup } from './invite-code-lookup';
import { inviteLinkDestination } from './invite-link-page';

export const inviteCodeLookup = Symbol('inviteCodeLookup');

// The page prints only the code and a first name, and runs one inline script
// (copy the code, then open the App Store).
// CW01c: the board's two Google fonts load from Google, nothing else does.
const pageSecurityPolicy =
  "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

// Walkthrough n.º 13: a hosting path on the link host, like the
// authentication fallback pages, so it stays out of OpenAPI.
@ApiExcludeController()
@Controller({ version: VERSION_NEUTRAL })
export class InviteLinksController {
  constructor(
    @Inject(inviteCodeLookup)
    private readonly lookUp: (code: string) => Promise<InviteCodeLookup>,
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
      // #26: a Client's or a Trainer's live code travels with the link; the
      // page promises a free class only when the code opens one (BKM-014).
      invite:
        found?.status === 'valid' &&
        found.holderFirstName !== null &&
        found.holderKind !== null
          ? {
              code: found.code,
              holderFirstName: found.holderFirstName,
              freeClass: found.freeClass,
            }
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
