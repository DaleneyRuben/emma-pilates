# Proxy admin API requests through the Vercel origin

Status: accepted; [ADR-0091](./0091-retire-the-shared-development-environment.md) removes the development half of the routing, so only the production host proxies `/api/v1`

The admin web will call `/api/v1` on its own Vercel origin. Environment-specific Vercel routing proxies that path to the production Northflank API or shared Render development API, so browser code uses same-origin requests instead of calling those backend origins directly. The mobile application continues to call the backend with its bearer Authentication Session and does not use this browser proxy.

Admin Authentication Sessions use host-only `Secure`, `HttpOnly`, `SameSite=Lax` cookies without a shared parent-domain cookie. State-changing browser requests must also pass an exact trusted-origin check; the backend never authorizes an arbitrary `vercel.app` wildcard or trusts forwarded host information from an unverified requester. Preview deployment automation registers the exact protected preview origin with the shared development environment and removes it when practical after the preview is retired. Production permits only the configured production admin origin.

The proxy preserves RFC 9457 responses, streaming and cancellation behavior required by the generated Fetch client, correlation identifiers, and the original request method and path. Deployment verification must prove cookie behavior and trusted forwarding through the actual Vercel-to-backend route before admin authentication can ship.

Direct credentialed cross-origin browser calls were rejected because they require a larger CORS and cookie configuration surface across production and changing preview origins. A wildcard preview-origin policy was rejected because an unrelated deployment must not become a trusted credentialed origin. Moving authentication into Vercel functions was rejected because System Identity remains owned by the NestJS backend.
