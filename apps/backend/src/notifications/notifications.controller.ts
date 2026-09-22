import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
} from '@nestjs/swagger';
import { z } from 'zod';
import { authenticatedPrincipalResolver } from '../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import type {
  NotificationCategory,
  NotificationPage,
} from './list-notifications';
import { NotificationNotFoundError } from './mark-notification-read';

export const notificationList = Symbol('notificationList');
export const notificationUnreadCount = Symbol('notificationUnreadCount');
export const notificationMarkRead = Symbol('notificationMarkRead');
export const notificationMarkAllRead = Symbol('notificationMarkAllRead');

type ListHandler = (
  query: { limit: number; cursor: string | null },
  principal: AuthenticatedPrincipal,
) => Promise<NotificationPage>;
type UnreadCountHandler = (
  principal: AuthenticatedPrincipal,
) => Promise<number>;
type MarkReadHandler = (
  command: { notificationId: string },
  principal: AuthenticatedPrincipal,
) => Promise<void>;
type MarkAllReadHandler = (
  principal: AuthenticatedPrincipal,
) => Promise<{ marked: number }>;

const notificationCategories: [
  NotificationCategory,
  ...NotificationCategory[],
] = ['booking_schedule', 'reminder', 'subscription_payment', 'announcement'];

export class NotificationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: notificationCategories })
  category!: NotificationCategory;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  destinationType!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  destinationId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  readAt!: Date | null;
}

export class NotificationPageDto {
  @ApiProperty({ type: NotificationDto, isArray: true })
  items!: NotificationDto[];

  @ApiProperty()
  hasMore!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  nextCursor!: string | null;
}

export class UnreadNotificationCountDto {
  @ApiProperty({ minimum: 0 })
  unread!: number;
}

export class MarkedNotificationsDto {
  @ApiProperty({ minimum: 0 })
  marked!: number;
}

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional(),
});
const uuidSchema = z.uuid();

const invalidRequest = (detail: string): BadRequestException =>
  new BadRequestException({ code: 'invalid_request', detail });

@Controller({ path: 'notifications', version: '1' })
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    @Inject(notificationList) private readonly listPage: ListHandler,
    @Inject(notificationUnreadCount)
    private readonly countUnread: UnreadCountHandler,
    @Inject(notificationMarkRead) private readonly markOneRead: MarkReadHandler,
    @Inject(notificationMarkAllRead)
    private readonly markEveryRead: MarkAllReadHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'listNotifications' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiOkResponse({ type: NotificationPageDto })
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ): Promise<NotificationPageDto> {
    const parsed = listQuerySchema.safeParse(query);
    if (!parsed.success) throw invalidRequest('Invalid notification query');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );

    try {
      return await this.listPage(
        { limit: parsed.data.limit, cursor: parsed.data.cursor ?? null },
        principal,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Invalid notification cursor'
      ) {
        throw new BadRequestException({
          code: 'invalid_cursor',
          detail: 'Invalid notification cursor',
        });
      }
      throw error;
    }
  }

  @Get('unread-count')
  @ApiOperation({ operationId: 'getUnreadNotificationCount' })
  @ApiOkResponse({ type: UnreadNotificationCountDto })
  async unreadCount(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<UnreadNotificationCountDto> {
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return { unread: await this.countUnread(principal) };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'markAllNotificationsRead' })
  @ApiOkResponse({ type: MarkedNotificationsDto })
  async markAllRead(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<MarkedNotificationsDto> {
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return this.markEveryRead(principal);
  }

  @Post(':notificationId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'markNotificationRead' })
  @ApiParam({ name: 'notificationId', format: 'uuid' })
  @ApiNoContentResponse()
  async markRead(
    @Param('notificationId') notificationId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const parsed = uuidSchema.safeParse(notificationId);
    if (!parsed.success)
      throw invalidRequest('Invalid notification identifier');
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );

    try {
      await this.markOneRead({ notificationId: parsed.data }, principal);
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
