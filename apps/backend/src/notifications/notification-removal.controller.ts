import {
  BadRequestException,
  Controller,
  Delete,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { z } from 'zod';
import { authenticatedPrincipalResolver } from '../system-identity/authentication/authentication.controller';
import { refuseWhileImpersonating } from '../system-identity/authentication/refuse-while-impersonating';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import { NotificationNotFoundError } from './mark-notification-read';

export const notificationRemove = Symbol('notificationRemove');
export const notificationRestore = Symbol('notificationRestore');

type NotificationCommand = (
  command: { notificationId: string },
  principal: AuthenticatedPrincipal,
) => Promise<void>;

const uuidSchema = z.uuid();

// Walkthrough n.º 10 (C19c, C19d, E-F15): one notification at a time is
// removed by a swipe and can be brought back with «Deshacer». There is no
// «Borrar todas».
@Controller({ path: 'notifications', version: '1' })
@ApiBearerAuth()
export class NotificationRemovalController {
  constructor(
    @Inject(notificationRemove) private readonly removeOne: NotificationCommand,
    @Inject(notificationRestore)
    private readonly restoreOne: NotificationCommand,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Delete(':notificationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'removeNotification' })
  @ApiParam({ name: 'notificationId', format: 'uuid' })
  @ApiNoContentResponse()
  remove(
    @Param('notificationId') notificationId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    return this.run(this.removeOne, notificationId, authorization);
  }

  @Post(':notificationId/restore')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'restoreNotification' })
  @ApiParam({ name: 'notificationId', format: 'uuid' })
  @ApiNoContentResponse()
  restore(
    @Param('notificationId') notificationId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    return this.run(this.restoreOne, notificationId, authorization);
  }

  private async run(
    command: NotificationCommand,
    notificationId: string,
    authorization: string | undefined,
  ): Promise<void> {
    const parsed = uuidSchema.safeParse(notificationId);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid notification identifier',
      });
    }
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    refuseWhileImpersonating(principal);

    try {
      await command({ notificationId: parsed.data }, principal);
    } catch (error) {
      if (error instanceof NotificationNotFoundError) {
        throw new NotFoundException({
          code: 'notification_not_found',
          detail: 'Notification not found',
        });
      }
      throw error;
    }
  }
}
