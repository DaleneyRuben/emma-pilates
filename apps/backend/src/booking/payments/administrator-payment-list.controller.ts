import {
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { parsed, run } from '../administration/administration.controller';
import type {
  AdministratorPaymentPage,
  AdministratorPaymentQuery,
} from './administrator-payments';
import {
  AdminPaymentPageDto,
  parseAdminPaymentQuery,
  paymentInvoiceFilters,
  paymentStatusFilters,
} from './administrator-payments.dto';

export const administratorPaymentOperations = Symbol(
  'administratorPaymentOperations',
);

export type AdministratorPaymentOperations = {
  list: (
    query: AdministratorPaymentQuery,
    principal: AuthenticatedPrincipal,
  ) => Promise<AdministratorPaymentPage>;
};

// WEB-005 (AW28): the admin web's paged sales list (transfers, and cash since
// PAY-007). The Staff app keeps
// `GET …/payments/pending` unchanged (ADR-0016). Payment data is personal,
// so nothing is cached (ADR-0063).
@Controller({ path: 'administrator/payments', version: '1' })
@ApiBearerAuth()
export class AdministratorPaymentListController {
  constructor(
    @Inject(administratorPaymentOperations)
    private readonly operations: AdministratorPaymentOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'listAdminPayments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: paymentStatusFilters })
  @ApiQuery({
    name: 'invoice',
    required: false,
    enum: paymentInvoiceFilters,
    description:
      '«unissued»: confirmed sales with Invoice Data not marked «Factura emitida»',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Client name fragment, accents and case ignored',
  })
  @ApiOkResponse({ type: AdminPaymentPageDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminPaymentPageDto> {
    const input = parsed(parseAdminPaymentQuery(query), 'Invalid filters');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return run(() => this.operations.list(input, principal));
  }
}
