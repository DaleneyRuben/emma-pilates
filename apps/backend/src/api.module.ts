import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { ProblemDetailsFilter } from './http/problem-details.filter';
import { BookingModule } from './booking/booking.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SystemIdentityModule } from './system-identity/system-identity.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    HealthModule,
    SystemIdentityModule,
    BookingModule,
    UploadsModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ProblemDetailsFilter,
    },
  ],
})
export class ApiModule {}
