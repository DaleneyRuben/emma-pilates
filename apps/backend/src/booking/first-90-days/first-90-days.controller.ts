import {
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { requireId, run } from '../administration/administration-http';
import { ContactAlertListDto } from './first-90-days.dto';
import type { ContactAlertItem } from './list-contact-alerts';

export const contactAlertOperations = Symbol('contactAlertOperations');

export type ContactAlertOperations = {
  list: (
    principal: AuthenticatedPrincipal,
  ) => Promise<{ items: ContactAlertItem[]; totalItems: number }>;
  mark: (
    command: { clientId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<void>;
};

const civil = (date: Date): string => date.toISOString().slice(0, 10);

// BKM-013 / ADR-0102: the first-90-days contact list for the Administrator
// and the Coordinator. Personal data, so nothing is cached (ADR-0063).
@Controller({ path: 'administrator/contact-alerts', version: '1' })
@ApiBearerAuth()
export class ContactAlertsController {
  constructor(
    @Inject(contactAlertOperations)
    private readonly operations: ContactAlertOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  private authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }

  @Get()
  @ApiOperation({ operationId: 'listContactAlerts' })
  @ApiOkResponse({ type: ContactAlertListDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<ContactAlertListDto> {
    const principal = await this.authenticate(authorization);
    const page = await run(() => this.operations.list(principal));
    return {
      items: page.items.map((item) => ({
        ...item,
        startedOn: civil(item.startedOn),
      })),
      totalItems: page.totalItems,
    };
  }

  @Post(':clientId/contacted')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'markClientContacted' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async mark(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const id = requireId(clientId, 'Invalid Client identifier');
    const principal = await this.authenticate(authorization);
    await run(() => this.operations.mark({ clientId: id }, principal));
  }
}
