import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Put,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { streamImage } from '../../http/stream-image';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';
import {
  ClientPhotoError,
  clientPhotoVariants,
  type ClientPhotoVariant,
} from './client-photo';
import type { ClientProfile } from './client-profile';
import {
  ClientProfileDto,
  parseSetClientPhoto,
  SetClientPhotoDto,
} from './client-discovery.dto';

export const clientPhotoOperations = Symbol('clientPhotoOperations');
export const clientPhotoObjectStorage = Symbol('clientPhotoObjectStorage');

export type ClientPhotoOperations = {
  set: (
    command: { imageAssetId: string },
    principal: AuthenticatedPrincipal,
  ) => Promise<ClientProfile>;
  remove: (principal: AuthenticatedPrincipal) => Promise<void>;
  read: (
    query: { variant: ClientPhotoVariant },
    principal: AuthenticatedPrincipal,
  ) => Promise<{ objectKey: string; mediaType: string }>;
};
export type ClientPhotoObjectStorage = { get(key: string): Promise<Buffer> };

const isVariant = (value: unknown): value is ClientPhotoVariant =>
  typeof value === 'string' &&
  (clientPhotoVariants as readonly string[]).includes(value);

const run = async <Result>(work: () => Promise<Result>): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ClientPhotoError) {
      throw new HttpException(
        { code: error.code, detail: error.message },
        error.status,
      );
    }
    if (error instanceof BookingAccessDeniedError) {
      throw new ForbiddenException({
        code: 'booking_access_denied',
        detail: 'Booking access is denied',
      });
    }
    throw error;
  }
};

// Client 22's photo: one private route, the variant chosen by query like the
// receipt route (UPL-002); nothing here is cached (ADR-0063).
@Controller({ path: 'clients/current/photo', version: '1' })
@ApiBearerAuth()
export class ClientPhotoController {
  constructor(
    @Inject(clientPhotoOperations)
    private readonly operations: ClientPhotoOperations,
    @Inject(clientPhotoObjectStorage)
    private readonly storage: ClientPhotoObjectStorage,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Put()
  @ApiOperation({ operationId: 'setCurrentClientPhoto' })
  @ApiBody({ type: SetClientPhotoDto })
  @ApiOkResponse({ type: ClientProfileDto })
  @Header('Cache-Control', 'no-store')
  async set(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<ClientProfileDto> {
    const parsed = parseSetClientPhoto(body);
    if (parsed === null) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid profile photo request',
      });
    }
    const principal = await this.authenticate(authorization);
    return run(() => this.operations.set(parsed, principal));
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'removeCurrentClientPhoto' })
  @ApiNoContentResponse()
  @Header('Cache-Control', 'no-store')
  async remove(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const principal = await this.authenticate(authorization);
    await run(() => this.operations.remove(principal));
  }

  @Get()
  @ApiOperation({ operationId: 'getCurrentClientPhoto' })
  @ApiQuery({ name: 'variant', required: false, enum: clientPhotoVariants })
  @ApiProduces('image/jpeg')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async photo(
    @Query('variant') variant: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const chosen = variant ?? 'display';
    if (!isVariant(chosen)) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid profile photo variant',
      });
    }
    const principal = await this.authenticate(authorization);
    const image = await run(() =>
      this.operations.read({ variant: chosen }, principal),
    );
    const bytes = await this.storage.get(image.objectKey);
    return streamImage(response, bytes, image.mediaType, 'no-store');
  }

  private authenticate(authorization: string | undefined) {
    return authenticateBearer(this.principalResolver, authorization);
  }
}
