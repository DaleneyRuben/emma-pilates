import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  HttpException,
  Inject,
  Param,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../../system-identity/authentication/resolve-authenticated-principal';
import {
  requireId,
  run as runAdministration,
} from '../../administration/administration-http';
import { BookingAccessDeniedError } from '../../commands/create-booking';
import { InvoiceDataError, type InvoiceData } from './invoice-data';
import { LastInvoiceDataDto } from './invoice-data.dto';

export const invoiceDataOperations = Symbol('invoiceDataOperations');

export type InvoiceDataOperations = {
  readClient: (
    principal: AuthenticatedPrincipal,
  ) => Promise<InvoiceData | null>;
  readAssistant: (
    command: { clientId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<InvoiceData | null>;
};

const run = <Result>(work: () => Promise<Result>): Promise<Result> =>
  runAdministration(async () => {
    try {
      return await work();
    } catch (error) {
      if (error instanceof InvoiceDataError) {
        throw new HttpException(
          { code: error.code, detail: error.message },
          error.status,
        );
      }
      if (error instanceof BookingAccessDeniedError) {
        throw new ForbiddenException({
          code: 'booking_access_denied',
          detail: 'Booking access is denied',
        });
      }
      throw error;
    }
  });

abstract class InvoiceDataController {
  constructor(
    protected readonly operations: InvoiceDataOperations,
    private readonly principalResolver: PrincipalResolver,
  ) {}

  protected authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }
}

// PAY-007: the prefill of the Client's own purchase in the app (`10`).
@Controller({ path: 'clients/current/invoice-data', version: '1' })
@ApiBearerAuth()
export class ClientInvoiceDataController extends InvoiceDataController {
  constructor(
    @Inject(invoiceDataOperations) operations: InvoiceDataOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'getCurrentClientInvoiceData' })
  @ApiOkResponse({ type: LastInvoiceDataDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<LastInvoiceDataDto> {
    const principal = await this.authenticate(authorization);
    const invoiceData = await run(() => this.operations.readClient(principal));
    return { invoiceData };
  }
}

// PAY-007: the prefill of a cash sale at the front desk (`S10`).
@Controller({ path: 'assistant/clients', version: '1' })
@ApiBearerAuth()
export class AssistantInvoiceDataController extends InvoiceDataController {
  constructor(
    @Inject(invoiceDataOperations) operations: InvoiceDataOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get(':clientId/invoice-data')
  @ApiOperation({ operationId: 'getAssistantClientInvoiceData' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiOkResponse({ type: LastInvoiceDataDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<LastInvoiceDataDto> {
    const id = requireId(clientId, 'Invalid Client identifier');
    const principal = await this.authenticate(authorization);
    const invoiceData = await run(() =>
      this.operations.readAssistant({ clientId: id }, principal),
    );
    return { invoiceData };
  }
}
