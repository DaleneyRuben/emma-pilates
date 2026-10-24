import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
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
  parseUpdateAdminClientProfile,
  UpdateAdminClientProfileDto,
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
  /** Saves the correction and answers the refreshed detail. */
  updateProfile: (
    command: { clientId: string; name: string; phone: string | null },
    principal: AuthenticatedPrincipal,
  ) => Promise<AdministratorClientDetail>;
};

const civil = (date: Date): string => date.toISOString().slice(0, 10);

const toDetailDto = (
  client: AdministratorClientDetail,
): AdminClientDetailDto => {
  const current = client.subscription.subscription;
  return {
    ...client,
    clientSince: civil(client.clientSince),
    subscription: {
      status: client.subscription.status,
      nextSubscription: null,
      founderRenewalDeadline: client.subscription.founderRenewalDeadline,
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
};

const requireClientId = (clientId: string): string => {
  const id = parseUuid(clientId);
  if (id === null) {
    throw new BadRequestException({
      code: 'invalid_request',
      detail: 'Invalid Client identifier',
    });
  }
  return id;
};

// WEB-004 (AW21/AW22): Client oversight for the Administrator and the
// Coordinator (ADR-0102), with IDN-009's profile correction. The responses
// carry personal data, so nothing is cached (ADR-0063).
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
    const id = requireClientId(clientId);
    const principal = await this.authenticate(authorization);
    return toDetailDto(
      await run(() => this.operations.read({ clientId: id }, principal)),
    );
  }

  // IDN-009: the Administrator and the Coordinator correct a Client's name
  // and phone (ADR-0102).
  @Patch(':clientId')
  @ApiOperation({ operationId: 'updateAdminClientProfile' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiBody({ type: UpdateAdminClientProfileDto })
  @ApiOkResponse({ type: AdminClientDetailDto })
  @Header('Cache-Control', 'no-store')
  async updateProfile(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminClientDetailDto> {
    const id = requireClientId(clientId);
    const changes = parsed(
      parseUpdateAdminClientProfile(body),
      'Invalid profile correction',
    );
    const principal = await this.authenticate(authorization);
    return toDetailDto(
      await run(() =>
        this.operations.updateProfile({ clientId: id, ...changes }, principal),
      ),
    );
  }
}
