import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import type { Environment } from './config/environment';
import { BackOfficeModule } from './back-office/back-office.module';
import { HealthModule } from './health/health.module';
import { ProblemDetailsFilter } from './http/problem-details.filter';
import {
  ERROR_REPORTER,
  createErrorReporter,
} from './monitoring/error-reporting';
import { BookingModule } from './booking/booking.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SystemIdentityModule } from './system-identity/system-identity.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    HealthModule,
    SystemIdentityModule,
    BookingModule,
    BackOfficeModule,
    UploadsModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ProblemDetailsFilter,
    },
    {
      provide: ERROR_REPORTER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        createErrorReporter({
          dsn: config.get('ERROR_REPORTING_DSN', { infer: true }),
          environment: config.get('NODE_ENV', { infer: true }),
          release: config.get('RELEASE_ID', { infer: true }),
          service: 'api',
        }),
    },
  ],
})
export class ApiModule {}
