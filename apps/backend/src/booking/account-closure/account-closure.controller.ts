import {
  Body,
  Controller,
  Header,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
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
import { parsed, requireId } from '../administration/administration-http';
import {
  AccountClosureError,
  type ClosureSummary,
} from './close-client-account';
import {
  AccountClosureSummaryDto,
  CloseAccountRequestDto,
  parseCloseAccountRequest,
} from './account-closure.dto';
import type { AccountClosure } from './prisma-account-closure';

export const accountClosureOperations = Symbol('accountClosureOperations');

const run = async (work: () => Promise<ClosureSummary>) => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof AccountClosureError) {
      throw new HttpException(
        { code: error.code, detail: error.message },
        error.status,
      );
    }
    throw error;
  }
};

// BE-007 G2: a Client closes their own Account from the app (password
// re-entered), and an Administrator closes a Client's from AW22.
@Controller({ version: '1' })
@ApiBearerAuth()
export class AccountClosureController {
  constructor(
    @Inject(accountClosureOperations)
    private readonly operations: AccountClosure,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Post('accounts/current/closure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'closeCurrentClientAccount' })
  @ApiOkResponse({ type: AccountClosureSummaryDto })
  @Header('Cache-Control', 'no-store')
  async closeCurrent(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: CloseAccountRequestDto,
  ): Promise<AccountClosureSummaryDto> {
    const { password } = parsed(
      parseCloseAccountRequest(body),
      'Invalid closure',
    );
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return run(() => {
      if (principal.identity.kind !== 'client') {
        throw new AccountClosureError('closure_access_denied');
      }
      return this.operations.close(
        { clientId: principal.identity.clientId, password },
        principal,
      );
    });
  }

  @Post('administrator/clients/:clientId/closure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'closeAdminClientAccount' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiOkResponse({ type: AccountClosureSummaryDto })
  @Header('Cache-Control', 'no-store')
  async closeClient(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AccountClosureSummaryDto> {
    const id = requireId(clientId, 'Invalid Client identifier');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return run(() => this.operations.close({ clientId: id }, principal));
  }
}
