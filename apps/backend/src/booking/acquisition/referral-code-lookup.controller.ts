import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Inject,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { parseAvailabilityQuery } from './own-referral-code.dto';
import type { ReferralCodeLookup } from './referral-code-lookup';

export const referralCodeLookup = Symbol('referralCodeLookup');

export class ReferralCodeLookupDto {
  @ApiProperty({ example: 'LUCIA', description: 'The code as it is stored' })
  code!: string;

  @ApiProperty({
    enum: ['valid', 'unknown'],
    description: '`unknown`: registering with it would be refused',
  })
  status!: 'valid' | 'unknown';

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Lucía',
    description: "The holder's first name; null when unknown",
  })
  holderFirstName!: string | null;

  @ApiPropertyOptional({
    enum: ['client', 'trainer'],
    nullable: true,
    description: "Whose code: a Client's or a Trainer's; null when unknown",
  })
  holderKind!: 'client' | 'trainer' | null;
}

// Walkthrough n.º 18 (C01b5, C01b6): «Crea tu cuenta» checks a typed code
// before the Account exists, so this needs no credential.
@Controller({ path: 'referral-codes', version: '1' })
export class ReferralCodeLookupController {
  constructor(
    @Inject(referralCodeLookup)
    private readonly lookUp: (code: string) => Promise<ReferralCodeLookup>,
  ) {}

  @Get('lookup')
  @ApiOperation({ operationId: 'lookUpReferralCode' })
  @ApiQuery({ name: 'code', type: String })
  @ApiOkResponse({ type: ReferralCodeLookupDto })
  @ApiTooManyRequestsResponse({
    description:
      'Too many code lookups from this network address this minute (rate_limit_exceeded)',
    headers: {
      'Retry-After': {
        description: 'Seconds until the address may look codes up again',
        schema: { type: 'integer' },
      },
    },
  })
  @Header('Cache-Control', 'no-store')
  async read(@Query('code') code: unknown): Promise<ReferralCodeLookupDto> {
    const parsed = parseAvailabilityQuery(code);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Send the code to look up',
      });
    }
    return this.lookUp(parsed.data);
  }
}
