import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpException,
  Inject,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
} from '@nestjs/swagger';
import { z } from 'zod';
import { idempotencyHeader } from '../../http/idempotency-key';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { run } from '../administration/administration-http';
import { parseUuid } from '../booking.dto';
import { CampaignError, campaignClassMaximum } from './grant-campaign';

export const campaignGrant = Symbol('campaignGrant');
export const campaignPreview = Symbol('campaignPreview');

export type CampaignGrantCommand = (
  command: { name: string; classes: number; idempotencyKey: string },
  principal: AuthenticatedPrincipal,
) => Promise<CampaignResultDto>;

export class CampaignClientDto {
  @ApiProperty({ format: 'uuid' })
  clientId!: string;

  @ApiProperty()
  name!: string;
}

// FIX-060 (walkthrough finding 87) added the reason. FIX-064 (walkthrough
// finding 90) skips nobody: the list is always empty, kept so an older admin
// web still reads the answer.
export class CampaignSkippedClientDto extends CampaignClientDto {
  @ApiProperty({
    enum: ['founder', 'no_current_plan'],
    description: 'Deprecated: a campaign skips nobody since FIX-064',
  })
  reason!: 'founder' | 'no_current_plan';
}

const owedDescription =
  'Active Clients without a current Plan: their next activated Plan collects the classes';

// Walkthrough finding 92: the page warns before giving a campaign again.
export class PastCampaignDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'date-time', description: 'Its latest grant' })
  grantedAt!: Date;
}

export class CampaignPreviewDto {
  @ApiProperty({ description: 'Every active Client, with a Plan or owed' })
  recipientCount!: number;

  @ApiProperty({ type: [CampaignClientDto], description: owedDescription })
  owed!: CampaignClientDto[];

  @ApiProperty({ type: [CampaignSkippedClientDto], deprecated: true })
  skipped!: CampaignSkippedClientDto[];

  @ApiProperty({
    type: [PastCampaignDto],
    description: 'Each campaign name already given, latest first',
  })
  pastCampaigns!: PastCampaignDto[];
}

export type CampaignPreview = (
  principal: AuthenticatedPrincipal,
) => Promise<CampaignPreviewDto>;

export class GrantCampaignDto {
  @ApiProperty({ description: 'The campaign name, kept in the audit' })
  name!: string;

  @ApiProperty({ minimum: 1, maximum: campaignClassMaximum })
  classes!: number;
}

export class CampaignResultDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  classes!: number;

  @ApiProperty({
    type: [CampaignClientDto],
    description: 'Active Clients whose current Plan received the classes',
  })
  granted!: CampaignClientDto[];

  @ApiProperty({ type: [CampaignClientDto], description: owedDescription })
  owed!: CampaignClientDto[];

  @ApiProperty({ type: [CampaignSkippedClientDto], deprecated: true })
  skipped!: CampaignSkippedClientDto[];
}

const bodySchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    classes: z.number().int().min(1).max(campaignClassMaximum),
  })
  .strict();

const invalid = (detail: string) =>
  new BadRequestException({ code: 'invalid_request', detail });

// Decisions §5.4: only the Administrator grants a campaign, and it never
// discounts a price. Every active Client gets it (booking ADR-0014).
@Controller({ path: 'administrator/campaigns', version: '1' })
@ApiBearerAuth()
export class CampaignController {
  constructor(
    @Inject(campaignGrant)
    private readonly grant: CampaignGrantCommand,
    @Inject(campaignPreview)
    private readonly previewCampaign: CampaignPreview,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get('preview')
  @ApiOperation({ operationId: 'previewCampaign' })
  @ApiOkResponse({ type: CampaignPreviewDto })
  @Header('Cache-Control', 'no-store')
  async preview(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<CampaignPreviewDto> {
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return run(() => this.previewCampaign(principal));
  }

  @Post()
  @ApiOperation({ operationId: 'grantCampaign' })
  @ApiHeader(idempotencyHeader)
  @ApiBody({ type: GrantCampaignDto })
  @ApiCreatedResponse({ type: CampaignResultDto })
  @Header('Cache-Control', 'no-store')
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<CampaignResultDto> {
    const key = parseUuid(idempotencyKey);
    if (key === null) throw invalid('Idempotency-Key must be a UUID');
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) throw invalid('Invalid campaign');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    try {
      return await run(() =>
        this.grant({ ...parsed.data, idempotencyKey: key }, principal),
      );
    } catch (error) {
      if (error instanceof CampaignError) {
        throw new HttpException(
          { code: error.code, detail: error.message },
          error.status,
        );
      }
      throw error;
    }
  }
}
