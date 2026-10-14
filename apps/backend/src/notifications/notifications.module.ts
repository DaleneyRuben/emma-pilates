import { Module } from '@nestjs/common';
import { PRISMA_CLIENT } from '../database/database.module';
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
import {
  DevicesController,
  deviceDeactivation,
  deviceRegistration,
} from './devices/devices.controller';
import { createPrismaAccountDevices } from './devices/prisma-account-devices';
import { createNotificationStore } from './prisma-notification-store';

const notificationStore = Symbol('notificationStore');
const accountDevices = Symbol('accountDevices');

type Store = ReturnType<typeof createNotificationStore>;
type Devices = ReturnType<typeof createPrismaAccountDevices>;

@Module({
  imports: [SystemIdentityModule],
  controllers: [NotificationsController, DevicesController],
  providers: [
    {
      provide: accountDevices,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient) => createPrismaAccountDevices(prisma),
    },
    {
      provide: deviceRegistration,
      inject: [accountDevices],
      useFactory: (devices: Devices) => devices.registerCurrentDevice,
    },
    {
      provide: deviceDeactivation,
      inject: [accountDevices],
      useFactory: (devices: Devices) => devices.deactivateCurrentDevice,
    },
    {
      provide: notificationStore,
      inject: [PRISMA_CLIENT],
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
  ],
})
export class NotificationsModule {}
