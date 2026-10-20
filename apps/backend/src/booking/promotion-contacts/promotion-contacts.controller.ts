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
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
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
import { parsed, requireId, run } from '../administration/administration-http';
import type {
  PromotionContactPage,
  PromotionContactRow,
} from './promotion-contacts';
import {
  AdminPromotionContactDto,
  AdminPromotionContactExportDto,
  AdminPromotionContactPageDto,
  parsePromotionContactQuery,
} from './promotion-contacts.dto';

export const promotionContactOperations = Symbol('promotionContactOperations');

export type PromotionContactOperations = {
  list: (
    query: { page: number; pageSize: number; query?: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<PromotionContactPage>;
  export: (principal: AuthenticatedPrincipal) => Promise<PromotionContactRow[]>;
  withdraw: (
    command: { contactId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<void>;
};

const toDto = (row: PromotionContactRow): AdminPromotionContactDto => ({
  ...row,
  consentedAt: row.consentedAt.toISOString(),
});

// BE-022: the Promotion Contacts of ADR-0097. Personal data, so nothing is
// cached (ADR-0063).
@Controller({ path: 'administrator/promotion-contacts', version: '1' })
@ApiBearerAuth()
export class AdministratorPromotionContactsController {
  constructor(
    @Inject(promotionContactOperations)
    private readonly operations: PromotionContactOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  private authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }

  @Get()
  @ApiOperation({ operationId: 'listAdminPromotionContacts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Name, email, or phone fragment, accents and case ignored',
  })
  @ApiOkResponse({ type: AdminPromotionContactPageDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminPromotionContactPageDto> {
    const input = parsed(parsePromotionContactQuery(query), 'Invalid filters');
    const principal = await this.authenticate(authorization);
    const page = await run(() => this.operations.list(input, principal));
    return { ...page, items: page.items.map(toDto) };
  }

  @Get('export')
  @ApiOperation({
    operationId: 'exportAdminPromotionContacts',
    description: 'Every contact not withdrawn; audited',
  })
  @ApiOkResponse({ type: AdminPromotionContactExportDto })
  @Header('Cache-Control', 'no-store')
  async export(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AdminPromotionContactExportDto> {
    const principal = await this.authenticate(authorization);
    const rows = await run(() => this.operations.export(principal));
    return { items: rows.map(toDto) };
  }

  @Post(':contactId/withdrawal')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'withdrawAdminPromotionContact',
    description: 'Records a «stop» request and erases the contact’s details',
  })
  @ApiParam({ name: 'contactId', format: 'uuid' })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async withdraw(
    @Param('contactId') contactId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const id = requireId(contactId, 'Invalid Promotion Contact identifier');
    const principal = await this.authenticate(authorization);
    await run(() => this.operations.withdraw({ contactId: id }, principal));
  }
}
