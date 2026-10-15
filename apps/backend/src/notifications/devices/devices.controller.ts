import {
  BadRequestException,
  Body,
  Controller,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiOperation,
  ApiProperty,
} from '@nestjs/swagger';
import { z } from 'zod';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import type { RegisterCurrentDevice } from './prisma-account-devices';

export const deviceRegistration = Symbol('deviceRegistration');
export const deviceDeactivation = Symbol('deviceDeactivation');

type RegisterHandler = (input: RegisterCurrentDevice) => Promise<void>;
type DeactivateHandler = (input: {
  accountId: string;
  installationId: string;
}) => Promise<void>;

const installationIdSchema = z.string().min(8).max(200);

const registrationSchema = z
  .object({
    installationId: installationIdSchema,
    expoPushToken: z
      .string()
      .max(255)
      .regex(/^Expo(nent)?PushToken\[[^\]]+\]$/),
    platform: z.enum(['ios', 'android']),
  })
  .strict();

const deactivationSchema = z
  .object({ installationId: installationIdSchema })
  .strict();

export class DeviceRegistrationDto {
  @ApiProperty({ minLength: 8, maxLength: 200 })
  installationId!: string;

  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  expoPushToken!: string;

  @ApiProperty({ enum: ['ios', 'android'] })
  platform!: 'ios' | 'android';
}

export class DeviceDeactivationDto {
  @ApiProperty({ minLength: 8, maxLength: 200 })
  installationId!: string;
}

const invalidRequest = (detail: string): BadRequestException =>
  new BadRequestException({ code: 'invalid_request', detail });

// ADR-0025: an installation registers its Expo push token as an endpoint of
// the signed-in Account and links it to the current Authentication Session.
@Controller({ path: 'notifications/devices', version: '1' })
@ApiBearerAuth()
export class DevicesController {
  constructor(
    @Inject(deviceRegistration) private readonly register: RegisterHandler,
    @Inject(deviceDeactivation) private readonly deactivate: DeactivateHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Put('current')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'registerCurrentDevice' })
  @ApiBody({ type: DeviceRegistrationDto })
  @ApiNoContentResponse()
  async registerCurrent(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<void> {
    const parsed = registrationSchema.safeParse(body);
    if (!parsed.success) throw invalidRequest('Invalid device registration');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );

    await this.register({
      accountId: principal.accountId,
      authenticationSessionId: principal.authenticationSessionId,
      ...parsed.data,
    });
  }

  @Post('current/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'deactivateCurrentDevice' })
  @ApiBody({ type: DeviceDeactivationDto })
  @ApiNoContentResponse()
  async deactivateCurrent(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<void> {
    const parsed = deactivationSchema.safeParse(body);
    if (!parsed.success) throw invalidRequest('Invalid device deactivation');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );

    await this.deactivate({
      accountId: principal.accountId,
      installationId: parsed.data.installationId,
    });
  }
}
