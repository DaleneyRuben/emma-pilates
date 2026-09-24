import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import type { PrincipalResolver } from '../../system-identity/authentication/bearer-principal';
import {
  BackOfficeController,
  backOfficeOperations,
  idempotencyHeader,
  parsed,
  requireId,
  requireIdempotencyKey,
  run,
  type BackOfficeOperations,
} from '../back-office-http';
import {
  AdminSupplyDto,
  AdminSupplyPageDto,
  parseMovementInput,
  parseSupplyChange,
  parseSupplyInput,
  parseSupplyQuery,
  SupplyChangeDto,
  SupplyInputDto,
  SupplyMovementDto,
  SupplyMovementInputDto,
  supplyStatuses,
} from '../back-office.dto';

@Controller({ path: 'administrator/supplies', version: '1' })
@ApiBearerAuth()
export class AdministratorSuppliesController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }

  @Get()
  @ApiOperation({ operationId: 'listAdminSupplies' })
  @ApiQuery({ name: 'branchId', required: true, schema: { format: 'uuid' } })
  @ApiQuery({ name: 'status', required: false, enum: supplyStatuses })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: AdminSupplyPageDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<AdminSupplyPageDto> {
    const input = parsed(parseSupplyQuery(query), 'Invalid Supply filters');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.supplies.listSupplies(input, principal));
  }

  @Post()
  @ApiOperation({ operationId: 'createSupply' })
  @ApiBody({ type: SupplyInputDto })
  @ApiCreatedResponse({ type: AdminSupplyDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminSupplyDto> {
    const input = parsed(parseSupplyInput(body), 'Invalid Supply');
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.supplies.createSupply(input, principal));
  }

  @Put(':supplyId')
  @ApiOperation({ operationId: 'updateSupply' })
  @ApiParam({ name: 'supplyId', format: 'uuid' })
  @ApiBody({ type: SupplyChangeDto })
  @ApiOkResponse({ type: AdminSupplyDto })
  @Header('Cache-Control', 'no-store')
  async update(
    @Param('supplyId') supplyId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AdminSupplyDto> {
    const id = requireId(supplyId, 'Invalid Supply identifier');
    const input = parsed(parseSupplyChange(body), 'Invalid Supply');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.supplies.updateSupply(
        { ...input, supplyId: id },
        principal,
      ),
    );
  }

  @Post(':supplyId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'archiveSupply' })
  @ApiParam({ name: 'supplyId', format: 'uuid' })
  @ApiOkResponse({ type: AdminSupplyDto })
  @Header('Cache-Control', 'no-store')
  async archive(
    @Param('supplyId') supplyId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AdminSupplyDto> {
    const id = requireId(supplyId, 'Invalid Supply identifier');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.supplies.archiveSupply({ supplyId: id }, principal),
    );
  }

  @Post(':supplyId/withdrawals')
  @ApiOperation({ operationId: 'recordWithdrawal' })
  @ApiParam({ name: 'supplyId', format: 'uuid' })
  @ApiHeader(idempotencyHeader)
  @ApiBody({ type: SupplyMovementInputDto })
  @ApiCreatedResponse({ type: SupplyMovementDto })
  @Header('Cache-Control', 'no-store')
  async withdraw(
    @Param('supplyId') supplyId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<SupplyMovementDto> {
    const id = requireId(supplyId, 'Invalid Supply identifier');
    const input = parsed(parseMovementInput(body), 'Invalid Withdrawal');
    const key = requireIdempotencyKey(idempotencyKey);
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.supplies.recordWithdrawal(
        { supplyId: id, quantity: input.quantity },
        principal,
        key,
      ),
    );
  }

  @Post(':supplyId/restocks')
  @ApiOperation({ operationId: 'recordRestock' })
  @ApiParam({ name: 'supplyId', format: 'uuid' })
  @ApiHeader(idempotencyHeader)
  @ApiBody({ type: SupplyMovementInputDto })
  @ApiCreatedResponse({ type: SupplyMovementDto })
  @Header('Cache-Control', 'no-store')
  async restock(
    @Param('supplyId') supplyId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<SupplyMovementDto> {
    const id = requireId(supplyId, 'Invalid Supply identifier');
    const input = parsed(parseMovementInput(body), 'Invalid Restock');
    const key = requireIdempotencyKey(idempotencyKey);
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.supplies.recordRestock(
        { supplyId: id, quantity: input.quantity },
        principal,
        key,
      ),
    );
  }
}
