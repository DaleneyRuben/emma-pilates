import {
  BadRequestException,
  Body,
  Controller,
  Header,
  Headers,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
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
import { runPaymentCommand } from './payments.controller';
import { PaymentDto } from './payments.dto';
import type { PaymentView } from './prisma-payment-commands';

export const courtesyAccessGrant = Symbol('courtesyAccessGrant');

export type CourtesyAccessGrant = (
  command: { clientId: string; endsOn: Date },
  principal: AuthenticatedPrincipal,
  idempotencyKey: string,
) => Promise<PaymentView>;

export class GrantCourtesyAccessDto {
  @ApiProperty({
    format: 'date',
    description:
      'Bolivia civil date of the last day of access: today up to one year ahead.',
  })
  endsOn!: string;
}

const grantSchema = z.object({ endsOn: z.iso.date() }).strict();

const invalidRequest = (detail: string): BadRequestException =>
  new BadRequestException({ code: 'invalid_request', detail });

const requireUuid = (value: string | undefined, detail: string): string => {
  const parsed = parseUuid(value);
  if (parsed === null) throw invalidRequest(detail);
  return parsed;
};

// REL-011: the Administrator gives a closed-test tester or a store reviewer
// «Acceso de prueba» from the Client detail (AW22). Everyone else is refused
// by the use case (403); the Plan never appears in a catalog.
@Controller({ path: 'administrator/clients', version: '1' })
@ApiBearerAuth()
export class CourtesyAccessController {
  constructor(
    @Inject(courtesyAccessGrant) private readonly grant: CourtesyAccessGrant,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Post(':clientId/courtesy-access')
  @ApiOperation({ operationId: 'grantCourtesyAccess' })
  @ApiParam({ name: 'clientId', format: 'uuid' })
  @ApiHeader({
    name: 'idempotency-key',
    required: true,
    schema: { format: 'uuid' },
  })
  @ApiBody({ type: GrantCourtesyAccessDto })
  @ApiCreatedResponse({ type: PaymentDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Param('clientId') clientId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<PaymentDto> {
    const id = requireUuid(clientId, 'Invalid Client identifier');
    const key = requireUuid(idempotencyKey, 'Idempotency-Key must be a UUID');
    const parsed = grantSchema.safeParse(body);
    if (!parsed.success) throw invalidRequest('Invalid end date');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return run(() =>
      runPaymentCommand(() =>
        this.grant(
          {
            clientId: id,
            endsOn: new Date(`${parsed.data.endsOn}T00:00:00.000Z`),
          },
          principal,
          key,
        ),
      ),
    );
  }
}
