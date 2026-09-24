import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { parsed, run } from '../administration/administration.controller';
import { parseUuid } from '../booking.dto';
import type {
  AdministratorClientDetail,
  AdministratorClientPage,
} from './administrator-clients';
import {
  AdminClientDetailDto,
  AdminClientPageDto,
  parseClientDirectoryQuery,
} from './administrator-clients.dto';

export const administratorClientOperations = Symbol(
  'administratorClientOperations',
);

export type AdministratorClientOperations = {
  list: (
    query: { page: number; pageSize: number; query?: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<AdministratorClientPage>;
  read: (
    command: { clientId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<AdministratorClientDetail>;
};

const civil = (date: Date): string => date.toISOString().slice(0, 10);

// WEB-004 (AW21/AW22): read-only Client oversight for Administrators. The
// responses carry personal data, so nothing is cached (ADR-0063).
@Controller({ path: 'administrator/clients', version: '1' })
@ApiBearerAuth()
export class AdministratorClientsController {
  constructor(
    @Inject(administratorClientOperations)
    private readonly operations: AdministratorClientOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  private authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }

  @Get()
  @ApiOperation({ operationId: 'listAdminClients' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Name, email, or phone fragment, accents and case ignored',
  })
  @ApiOkResponse({ type: AdminClientPageDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminClientPageDto> {
    const input = parsed(parseClientDirectoryQuery(query), 'Invalid filters');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.list(input, principal));
  }

  @Get(':clientId')
  @ApiOperation({ operationId: 'getAdminClient' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiOkResponse({ type: AdminClientDetailDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AdminClientDetailDto> {
    const id = parseUuid(clientId);
    if (id === null) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid Client identifier',
      });
    }
    const principal = await this.authenticate(authorization);
    const client = await run(() =>
      this.operations.read({ clientId: id }, principal),
    );
    const current = client.subscription.subscription;
    return {
      ...client,
      clientSince: civil(client.clientSince),
      subscription: {
        status: client.subscription.status,
        subscription:
          current === null
            ? null
            : {
                ...current,
                startsOn: civil(current.startsOn),
                endsOn: civil(current.endsOn),
              },
      },
    };
  }
}
