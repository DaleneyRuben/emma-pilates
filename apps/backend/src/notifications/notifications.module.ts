import { Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { Environment } from '../config/environment';
import { PrismaClient } from '../generated/prisma/client';
import { SystemIdentityModule } from '../system-identity/system-identity.module';
import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import { listNotifications } from './list-notifications';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from './mark-notification-read';
import {
  NotificationsController,
  notificationList,
  notificationMarkAllRead,
  notificationMarkRead,
  notificationUnreadCount,
} from './notifications.controller';
import { createNotificationStore } from './prisma-notification-store';

const notificationsPrisma = Symbol('notificationsPrisma');
const notificationStore = Symbol('notificationStore');

class NotificationsRuntimeCleanup implements OnApplicationShutdown {
  constructor(private readonly prisma: PrismaClient) {}

  onApplicationShutdown(): Promise<void> {
    return this.prisma.$disconnect();
  }
}

type Store = ReturnType<typeof createNotificationStore>;

@Module({
  imports: [SystemIdentityModule],
  controllers: [NotificationsController],
  providers: [
    {
      provide: notificationsPrisma,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        new PrismaClient({
          adapter: new PrismaPg({
            connectionString: config.getOrThrow('DATABASE_URL'),
          }),
        }),
    },
    {
      provide: notificationStore,
      inject: [notificationsPrisma],
      useFactory: (prisma: PrismaClient) => createNotificationStore(prisma),
    },
    {
      provide: notificationList,
      inject: [notificationStore],
      useFactory:
        (store: Store) =>
        (
          query: { limit: number; cursor: string | null },
          principal: AuthenticatedPrincipal,
        ) =>
          listNotifications(query, {
            principal,
            findPage: (input) => store.findPage(input),
          }),
    },
    {
      provide: notificationUnreadCount,
      inject: [notificationStore],
      useFactory: (store: Store) => (principal: AuthenticatedPrincipal) =>
        store.countUnread(principal.accountId),
    },
    {
      provide: notificationMarkRead,
      inject: [notificationStore],
      useFactory:
        (store: Store) =>
        (
          command: { notificationId: string },
          principal: AuthenticatedPrincipal,
        ) =>
          markNotificationRead(command, {
            principal,
            markRead: (input) => store.markRead(input),
            now: () => new Date(),
          }),
    },
    {
      provide: notificationMarkAllRead,
      inject: [notificationStore],
      useFactory: (store: Store) => (principal: AuthenticatedPrincipal) =>
        markAllNotificationsRead({
          principal,
          markAllRead: (input) => store.markAllRead(input),
          now: () => new Date(),
        }),
    },
    {
      provide: NotificationsRuntimeCleanup,
      inject: [notificationsPrisma],
      useFactory: (prisma: PrismaClient) =>
        new NotificationsRuntimeCleanup(prisma),
    },
  ],
})
export class NotificationsModule {}
