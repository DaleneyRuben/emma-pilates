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
  ApiBody,
  ApiOkResponse,
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
import { VoidSaleError, voidSale, voidReasonMaxLength } from './void-sale';

export const voidSaleCommand = Symbol('voidSaleCommand');

export type VoidSaleCommand = (
  command: { paymentId: string; reason: string },
  principal: AuthenticatedPrincipal,
) => Promise<{
  paymentId: string;
  state: 'voided';
  voidReason: string;
  cancelledBookings: number;
}>;

export class VoidSaleDto {
  @ApiProperty({
    description: 'Why the sale is voided. Required, at most 300 characters.',
  })
  reason!: string;
}

export class VoidedSaleDto {
  @ApiProperty({ format: 'uuid' })
  paymentId!: string;

  @ApiProperty({ enum: ['voided'] })
  state!: 'voided';

  @ApiProperty()
  voidReason!: string;

  @ApiProperty({ minimum: 0 })
  cancelledBookings!: number;
}

const bodySchema = z
  .object({ reason: z.string().max(voidReasonMaxLength) })
  .strict();

// «Anular venta» is the Administrator's only edit of a sale (decisions §4.3).
@Controller({ path: 'administrator/payments', version: '1' })
@ApiBearerAuth()
export class VoidSaleController {
  constructor(
    @Inject(voidSaleCommand) private readonly voidPayment: VoidSaleCommand,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Post(':paymentId/void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'voidPayment' })
  @ApiParam({ name: 'paymentId', format: 'uuid' })
  @ApiBody({ type: VoidSaleDto })
  @ApiOkResponse({ type: VoidedSaleDto })
  @Header('Cache-Control', 'no-store')
  async void(
    @Param('paymentId') paymentId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<VoidedSaleDto> {
    const id = parseUuid(paymentId);
    if (id === null) {
      throw new HttpException(
        { code: 'invalid_request', detail: 'Invalid Payment identifier' },
        400,
      );
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        { code: 'void_reason_required', detail: 'A void needs a reason' },
        400,
      );
    }
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    try {
      return await run(() =>
        voidSale(
          { paymentId: id, reason: parsed.data.reason },
          {
            principal,
            now: new Date(),
            voidPayment: (input) => this.voidPayment(input, principal),
          },
        ),
      );
    } catch (error) {
      if (error instanceof VoidSaleError) {
        throw new HttpException(
          { code: error.code, detail: error.message },
          error.status,
        );
      }
      throw error;
    }
  }
}
