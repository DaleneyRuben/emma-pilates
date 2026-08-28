import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HealthController } from './health/health.controller';
import { ProblemDetailsFilter } from './http/problem-details.filter';

@Module({
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ProblemDetailsFilter,
    },
  ],
})
export class ApiModule {}
