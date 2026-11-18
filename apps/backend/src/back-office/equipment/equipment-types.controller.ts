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
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
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
  parsed,
  requireId,
  run,
  type BackOfficeOperations,
} from '../back-office-http';
import {
  EquipmentIssueDto,
  parseDamageInput,
  parseEquipmentQuery,
} from './equipment.dto';
import {
  EquipmentDamageInputDto,
  EquipmentStockDto,
  EquipmentStockInputDto,
  EquipmentStockListDto,
  EquipmentTypeDto,
  EquipmentTypeInputDto,
  EquipmentTypeListDto,
  EquipmentTypeRenameDto,
  parseStockInput,
  parseTypeInput,
  parseTypeRename,
} from './equipment-type.dto';

abstract class EquipmentTypeController extends BackOfficeController {
  constructor(
    @Inject(backOfficeOperations) operations: BackOfficeOperations,
    @Inject(authenticatedPrincipalResolver) resolver: PrincipalResolver,
  ) {
    super(operations, resolver);
  }
}

// FIX-067: the studio's Equipment Types (AW37 «Tipos»).
@Controller({ path: 'administrator/equipment-types', version: '1' })
@ApiBearerAuth()
export class AdministratorEquipmentTypesController extends EquipmentTypeController {
  @Get()
  @ApiOperation({ operationId: 'listEquipmentTypes' })
  @ApiOkResponse({ type: EquipmentTypeListDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<EquipmentTypeListDto> {
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.equipmentTypes.listTypes(principal));
  }

  @Post()
  @ApiOperation({ operationId: 'createEquipmentType' })
  @ApiBody({ type: EquipmentTypeInputDto })
  @ApiCreatedResponse({ type: EquipmentTypeDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<EquipmentTypeDto> {
    const input = parsed(parseTypeInput(body), 'Invalid Equipment Type');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.equipmentTypes.createType(input, principal),
    );
  }

  @Patch(':typeId')
  @ApiOperation({ operationId: 'renameEquipmentType' })
  @ApiParam({ name: 'typeId', format: 'uuid' })
  @ApiBody({ type: EquipmentTypeRenameDto })
  @ApiOkResponse({ type: EquipmentTypeDto })
  @Header('Cache-Control', 'no-store')
  async rename(
    @Param('typeId') typeId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<EquipmentTypeDto> {
    const id = requireId(typeId, 'Invalid Equipment Type identifier');
    const input = parsed(parseTypeRename(body), 'Invalid Equipment Type');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.equipmentTypes.renameType(
        { typeId: id, ...input },
        principal,
      ),
    );
  }

  @Post(':typeId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'archiveEquipmentType' })
  @ApiParam({ name: 'typeId', format: 'uuid' })
  @ApiOkResponse({ type: EquipmentTypeDto })
  @Header('Cache-Control', 'no-store')
  async archive(
    @Param('typeId') typeId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<EquipmentTypeDto> {
    const id = requireId(typeId, 'Invalid Equipment Type identifier');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.equipmentTypes.archiveType({ typeId: id }, principal),
    );
  }
}

// FIX-067: a Branch's counts of quantity types and their damage.
@Controller({ path: 'administrator/equipment-stocks', version: '1' })
@ApiBearerAuth()
export class AdministratorEquipmentStocksController extends EquipmentTypeController {
  @Get()
  @ApiOperation({ operationId: 'listEquipmentStocks' })
  @ApiQuery({ name: 'branchId', required: true, schema: { format: 'uuid' } })
  @ApiOkResponse({ type: EquipmentStockListDto })
  @Header('Cache-Control', 'no-store')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<EquipmentStockListDto> {
    const input = parsed(parseEquipmentQuery(query), 'Invalid Branch');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.equipmentStocks.listStocks(input, principal),
    );
  }

  @Put()
  @ApiOperation({ operationId: 'setEquipmentStockQuantity' })
  @ApiBody({ type: EquipmentStockInputDto })
  @ApiOkResponse({ type: EquipmentStockDto })
  @Header('Cache-Control', 'no-store')
  async set(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<EquipmentStockDto> {
    const input = parsed(parseStockInput(body), 'Invalid quantity');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.equipmentStocks.setStockQuantity(input, principal),
    );
  }

  @Post('damage')
  @ApiOperation({ operationId: 'reportEquipmentStockDamage' })
  @ApiBody({ type: EquipmentDamageInputDto })
  @ApiCreatedResponse({ type: EquipmentIssueDto })
  @Header('Cache-Control', 'no-store')
  async damage(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<EquipmentIssueDto> {
    const input = parsed(parseDamageInput(body), 'Invalid damage report');
    const principal = await this.authenticate(authorization);
    return run(() =>
      this.operations.equipmentStocks.reportStockDamage(input, principal),
    );
  }
}
