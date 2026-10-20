import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { denyNonClients } from '../client/deny-non-clients';
import type { PromotionsConsentView } from './promotions-consent';
import {
  parseSetPromotionsConsent,
  PromotionsConsentDto,
  SetPromotionsConsentDto,
} from './promotions-consent.dto';

export const promotionsConsentOperations = Symbol(
  'promotionsConsentOperations',
);

export type PromotionsConsentOperations = {
  read: (principal: AuthenticatedPrincipal) => Promise<PromotionsConsentView>;
  set: (
    command: { consented: boolean },
    principal: AuthenticatedPrincipal,
  ) => Promise<PromotionsConsentView>;
};

const toDto = (view: PromotionsConsentView): PromotionsConsentDto => ({
  consented: view.consented,
  consentedAt: view.consentedAt?.toISOString() ?? null,
});

// BE-023 (ADR-0098): Perfil's promotions switch. Personal data, so nothing is
// cached (ADR-0063).
@Controller({ path: 'clients/current/promotions-consent', version: '1' })
@ApiBearerAuth()
export class PromotionsConsentController {
  constructor(
    @Inject(promotionsConsentOperations)
    private readonly operations: PromotionsConsentOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  private authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }

  @Get()
  @ApiOperation({ operationId: 'getCurrentClientPromotionsConsent' })
  @ApiOkResponse({ type: PromotionsConsentDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<PromotionsConsentDto> {
    const principal = await this.authenticate(authorization);
    return toDto(await denyNonClients(() => this.operations.read(principal)));
  }

  @Put()
  @ApiOperation({ operationId: 'setCurrentClientPromotionsConsent' })
  @ApiBody({ type: SetPromotionsConsentDto })
  @ApiOkResponse({ type: PromotionsConsentDto })
  @Header('Cache-Control', 'no-store')
  async set(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<PromotionsConsentDto> {
    const command = parseSetPromotionsConsent(body);
    if (command === null) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid promotions consent',
      });
    }
    const principal = await this.authenticate(authorization);
    return toDto(
      await denyNonClients(() => this.operations.set(command, principal)),
    );
  }
}
