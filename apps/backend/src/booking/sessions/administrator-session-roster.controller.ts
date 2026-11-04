import {
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import type { AdministratorSessionRoster } from './administrator-session-roster';
import { AdministratorSessionRosterDto } from './administrator-session-roster.dto';

export const administratorSessionRoster = Symbol('administratorSessionRoster');

export type AdministratorSessionRosterHandler = (
  sessionId: string,
  principal: AuthenticatedPrincipal,
) => Promise<AdministratorSessionRoster>;

// WEB-039: Horario's class panel, for the Administrator and the Coordinator.
@Controller({ path: 'administrator/sessions', version: '1' })
@ApiBearerAuth()
export class AdministratorSessionRosterController {
  constructor(
    @Inject(administratorSessionRoster)
    private readonly loadRoster: AdministratorSessionRosterHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get(':sessionId/roster')
  @ApiOperation({ operationId: 'getAdministratorSessionRoster' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiOkResponse({ type: AdministratorSessionRosterDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AdministratorSessionRosterDto> {
    const id = requireId(sessionId, 'Invalid Session identifier');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return run(() => this.loadRoster(id, principal));
  }
}
