import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { isUuid } from '../staff/photo/staff-photo.dto';
import {
  ClientPhotoError,
  clientPhotoVariants,
  type ClientPhotoVariant,
} from './client-photo';
import { clientPhotoObjectStorage } from './client-photo.controller';
import type { ClientPhotoObjectStorage } from './client-photo.controller';

export const clientPhotoForStaff = Symbol('clientPhotoForStaff');

export type ClientPhotoForStaffRead = (
  query: { imageAssetId: string; variant: ClientPhotoVariant },
  principal: AuthenticatedPrincipal,
) => Promise<{ objectKey: string; mediaType: string }>;

const isVariant = (value: unknown): value is ClientPhotoVariant =>
  typeof value === 'string' &&
  (clientPhotoVariants as readonly string[]).includes(value);

// Finding n.º 30: a Client's photo by the asset a staff read model names
// (rosters, Pagos pendientes, the client file). Staff only; private and
// revalidated with an ETag on the asset, whose bytes never change (ADR-0063).
@Controller({ path: 'client-photos', version: '1' })
@ApiBearerAuth()
export class ClientPhotoForStaffController {
  constructor(
    @Inject(clientPhotoForStaff)
    private readonly read: ClientPhotoForStaffRead,
    @Inject(clientPhotoObjectStorage)
    private readonly storage: ClientPhotoObjectStorage,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get(':imageAssetId')
  @ApiOperation({ operationId: 'getClientPhotoForStaff' })
  @ApiQuery({ name: 'variant', required: false, enum: clientPhotoVariants })
  @ApiProduces('image/jpeg')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async photo(
    @Param('imageAssetId') imageAssetId: string,
    @Query('variant') variant: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile | undefined> {
    const chosen = variant ?? 'display';
    if (!isVariant(chosen) || !isUuid(imageAssetId)) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid client photo request',
      });
    }
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    let image: { objectKey: string; mediaType: string };
    try {
      image = await this.read({ imageAssetId, variant: chosen }, principal);
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
    const etag = `"${imageAssetId}-${chosen}"`;
    response.setHeader('ETag', etag);
    if (ifNoneMatch === etag) {
      response.setHeader('Cache-Control', 'private, no-cache');
      response.status(HttpStatus.NOT_MODIFIED);
      return undefined;
    }
    const bytes = await this.storage.get(image.objectKey);
    return streamImage(response, bytes, image.mediaType, 'private, no-cache');
  }
}
