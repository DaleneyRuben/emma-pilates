import {
  BadRequestException,
  Body,
  Controller,
  Header,
  Headers,
  HttpException,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
} from '@nestjs/swagger';
import { z } from 'zod';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { run } from '../administration/administration-http';
import { parseUuid } from '../booking.dto';
import { AllowanceAdjustmentError } from './record-allowance-adjustment';

export const allowanceAdjustmentCommand = Symbol('allowanceAdjustmentCommand');

export type AllowanceAdjustmentCommand = (
  command: {
    clientId: string;
    classes: number;
    reason: 'courtesy' | 'class_return';
  },
  principal: AuthenticatedPrincipal,
) => Promise<{ id: string; classes: number; reason: string }>;

export class RecordAllowanceAdjustmentDto {
  @ApiProperty({ description: 'A signed number of classes, never zero' })
  classes!: number;

  @ApiProperty({ enum: ['courtesy', 'class_return'] })
  reason!: 'courtesy' | 'class_return';
}

export class AllowanceAdjustmentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  classes!: number;

  @ApiProperty({ enum: ['courtesy', 'class_return'] })
  reason!: string;
}

const bodySchema = z
  .object({
    classes: z.number().int().min(-100).max(100),
    reason: z.enum(['courtesy', 'class_return']),
  })
  .strict();

const invalid = (detail: string) =>
  new BadRequestException({ code: 'invalid_request', detail });

// PAY-006 adds the admin web form. The endpoint exists now and denies
// everyone but the Administrator (decisions §4.3).
@Controller({ path: 'administrator/clients', version: '1' })
@ApiBearerAuth()
export class AllowanceAdjustmentController {
  constructor(
    @Inject(allowanceAdjustmentCommand)
    private readonly record: AllowanceAdjustmentCommand,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Post(':clientId/allowance-adjustments')
  @ApiOperation({ operationId: 'recordAllowanceAdjustment' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiBody({ type: RecordAllowanceAdjustmentDto })
  @ApiCreatedResponse({ type: AllowanceAdjustmentDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<AllowanceAdjustmentDto> {
    const id = parseUuid(clientId);
    if (id === null) throw invalid('Invalid Client identifier');
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success || parsed.data.classes === 0) {
      throw invalid('Invalid allowance adjustment');
    }
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    try {
      return await run(() =>
        this.record({ clientId: id, ...parsed.data }, principal),
      );
    } catch (error) {
      if (error instanceof AllowanceAdjustmentError) {
        throw new HttpException(
          { code: error.code, detail: error.message },
          error.status,
        );
      }
      throw error;
    }
  }
}
