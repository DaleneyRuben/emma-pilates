import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HealthController } from './health/health.controller';
import { ProblemDetailsFilter } from './http/problem-details.filter';
import { BookingModule } from './booking/booking.module';
import { SystemIdentityModule } from './system-identity/system-identity.module';

@Module({
  imports: [SystemIdentityModule, BookingModule],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ProblemDetailsFilter,
    },
  ],
})
export class ApiModule {}
