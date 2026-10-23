import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpException,
  Inject,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import { run } from '../administration/administration-http';
import type {
  StudioSettingsOperations,
  StudioSettingsView,
} from './prisma-studio-settings';
import { StudioSettingsError } from './studio-settings';
import {
  parseUpdateStudioSettings,
  StudioRulesDto,
  StudioSettingsDto,
  UpdateStudioSettingsDto,
} from './studio-settings.dto';

export const studioSettingsOperations = Symbol('studioSettingsOperations');

const statuses = {
  studio_settings_version_conflict: 409,
  invalid_studio_setting: 400,
} as const;

const runSettings = <Result>(work: () => Promise<Result>): Promise<Result> =>
  run(async () => {
    try {
      return await work();
    } catch (error) {
      if (error instanceof StudioSettingsError) {
        throw new HttpException(
          { code: error.code, detail: error.message },
          statuses[error.code],
        );
      }
      throw error;
    }
  });

const toDto = (view: StudioSettingsView): StudioSettingsDto => ({
  ...view,
  updatedAt: view.updatedAt.toISOString(),
});

// «Reglas del estudio» (AW36, BKM-004): the Administrator reads every Studio
// Setting and edits the configurable subset. Nothing here is cached.
@Controller({ path: 'administrator/studio-settings', version: '1' })
@ApiBearerAuth()
export class AdministratorStudioSettingsController {
  constructor(
    @Inject(studioSettingsOperations)
    private readonly operations: StudioSettingsOperations,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'getStudioSettings' })
  @ApiOkResponse({ type: StudioSettingsDto })
  @Header('Cache-Control', 'no-store')
  async read(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<StudioSettingsDto> {
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return toDto(await runSettings(() => this.operations.read(principal)));
  }

  @Put()
  @ApiOperation({ operationId: 'updateStudioSettings' })
  @ApiBody({ type: UpdateStudioSettingsDto })
  @ApiOkResponse({ type: StudioSettingsDto })
  @Header('Cache-Control', 'no-store')
  async update(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<StudioSettingsDto> {
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    const command = parseUpdateStudioSettings(body);
    if (command === null) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid Studio Settings',
      });
    }
    return toDto(
      await runSettings(() => this.operations.update(command, principal)),
    );
  }
}

// The client-facing rules, public so the apps read them before sign-in too.
// They change rarely, so a minute of caching lets a change on the web reach
// the apps without a build (ADR-0101).
@Controller({ path: 'studio-rules', version: '1' })
export class StudioRulesController {
  constructor(
    @Inject(studioSettingsOperations)
    private readonly operations: StudioSettingsOperations,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'getStudioRules' })
  @ApiOkResponse({ type: StudioRulesDto })
  @Header('Cache-Control', 'public, max-age=60')
  rules(): Promise<StudioRulesDto> {
    return this.operations.rules();
  }
}

export const studioSettingsControllers = [
  AdministratorStudioSettingsController,
  StudioRulesController,
] as const;
