import {
  BadRequestException,
  Body,
  Controller,
  Header,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import { StudioError } from './studio-errors';
import {
  parseStudioRecompute,
  StudioRecomputeDto,
  StudioRecomputeInputDto,
} from './studio.dto';

export const studioOperations = Symbol('studioOperations');

export type StudioOperations = {
  recompute(
    input: { month: string },
    principal: AuthenticatedPrincipal,
  ): Promise<{ month: string; sessions: number; clientMonths: number }>;
};

@Controller({ path: 'administrator/studio-facts', version: '1' })
@ApiBearerAuth()
export class StudioFactsController {
  constructor(
    @Inject(studioOperations) private readonly operations: StudioOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Post('recompute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'recomputeStudioFacts' })
  @ApiBody({ type: StudioRecomputeInputDto })
  @ApiOkResponse({ type: StudioRecomputeDto })
  @Header('Cache-Control', 'no-store')
  async recompute(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<StudioRecomputeDto> {
    const parsed = parseStudioRecompute(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid studio facts month',
      });
    }
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    try {
      return await this.operations.recompute(parsed.data, principal);
    } catch (error) {
      if (error instanceof StudioError) {
        throw new HttpException(
          { code: error.code, detail: error.message },
          error.status,
        );
      }
      throw error;
    }
  }
}

export const studioControllers = [StudioFactsController];
