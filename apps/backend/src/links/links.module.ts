import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import { ADMIN_WEB_ORIGIN, LinksController } from './links.controller';

@Module({
  controllers: [LinksController],
  providers: [
    {
      provide: ADMIN_WEB_ORIGIN,
      inject: [ConfigService],
      // The first trusted origin is the admin web's own, as the bootstrap
      // command's activation link already assumes.
      useFactory: (config: ConfigService<Environment, true>) =>
        config.get('ADMIN_WEB_TRUSTED_ORIGINS', { infer: true })[0],
    },
  ],
})
export class LinksModule {}
