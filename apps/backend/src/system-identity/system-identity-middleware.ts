import type { MiddlewareConsumer } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import { createAdminWebRequestMiddleware } from './admin-web/admin-web-request.middleware';
import { createRequestRateLimiter } from './security/request-rate-limit';
import { createRequestRateLimitMiddleware } from './security/request-rate-limit.middleware';
import { createNetworkAddressMiddleware } from './security/request-source';

/**
 * Every request: its throttling address (ADR-0087), the admin web's origin
 * and cookie (ADR-0084), then the general rate limit (ADR-0099).
 */
export function applySystemIdentityMiddleware(
  consumer: MiddlewareConsumer,
  config: ConfigService<Environment, true>,
): void {
  consumer
    .apply(
      createNetworkAddressMiddleware({
        trustedProxyHops: config.get('TRUSTED_PROXY_HOPS', { infer: true }),
        proxyProofSecret: config.get('ADMIN_WEB_PROXY_SECRET', { infer: true }),
      }),
      createAdminWebRequestMiddleware(
        config.getOrThrow('ADMIN_WEB_TRUSTED_ORIGINS'),
      ),
      createRequestRateLimitMiddleware(createRequestRateLimiter(Date.now)),
    )
    .forRoutes('{*splat}');
}
