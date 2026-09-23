import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ApiModule } from './api.module';
import { Environment, validateEnvironment } from './config/environment';
import { createLoggerParams } from './http/logging';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        createLoggerParams({
          environment: config.getOrThrow<string>('NODE_ENV'),
          service: 'api',
          release: config.getOrThrow<string>('RELEASE_ID'),
        }),
    }),
    ApiModule,
  ],
})
export class AppModule {}
