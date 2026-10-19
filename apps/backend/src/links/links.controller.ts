import {
  applyDecorators,
  Controller,
  Get,
  Header,
  Inject,
  NotFoundException,
  Param,
  Query,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  androidApps,
  androidAssetLinks,
  appleAppSiteAssociation,
  appleTeamId,
} from './app-links';
import { renderLinkFallbackPage } from './link-fallback-page';

export const ADMIN_WEB_ORIGIN = Symbol('ADMIN_WEB_ORIGIN');

// The token sits in the URL: keep it out of caches, referrers, and indexes.
const LinkPageHeaders = () =>
  applyDecorators(
    Header('Content-Type', 'text/html; charset=utf-8'),
    Header('Cache-Control', 'no-store'),
    Header('Referrer-Policy', 'no-referrer'),
    Header('X-Robots-Tag', 'noindex'),
    Header(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    ),
  );

// ADR-0095: the link hosts point at the API, which serves the app-link
// verification files and, for a browser, a page in place of a 404. These
// are hosting paths, not API operations, so they stay out of OpenAPI.
@ApiExcludeController()
@Controller({ version: VERSION_NEUTRAL })
export class LinksController {
  constructor(
    @Inject(ADMIN_WEB_ORIGIN) private readonly adminWebOrigin: string,
  ) {}

  @Get('.well-known/assetlinks.json')
  assetLinks() {
    return androidAssetLinks(androidApps);
  }

  @Get('.well-known/apple-app-site-association')
  @Header('Content-Type', 'application/json')
  appleAssociation() {
    return appleAppSiteAssociation(appleTeamId);
  }

  @Get('client/authentication/:purpose')
  @LinkPageHeaders()
  clientLink(
    @Param('purpose') purpose: string,
    @Query('token') token?: string,
  ): string {
    return this.page('client', purpose, token);
  }

  @Get('staff/authentication/:purpose')
  @LinkPageHeaders()
  staffLink(
    @Param('purpose') purpose: string,
    @Query('token') token?: string,
  ): string {
    return this.page('staff', purpose, token);
  }

  private page(
    identityKind: 'client' | 'staff',
    purpose: string,
    token: string | undefined,
  ): string {
    const page = renderLinkFallbackPage({
      identityKind,
      purpose,
      token: typeof token === 'string' && token !== '' ? token : null,
      adminWebOrigin: this.adminWebOrigin,
    });

    if (page === null) {
      throw new NotFoundException();
    }

    return page;
  }
}
