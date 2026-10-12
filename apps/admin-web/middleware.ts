import { next } from "@vercel/functions/middleware";

// Vercel Routing Middleware runs before vercel.json's /api/v1 rewrite, so the
// forwarded request carries the proof the API checks (ADR-0087). It imports
// nothing local: Vercel compiles this file alone and keeps import paths as
// written.
export const config = { matcher: "/api/v1/:path*" };

const proxyProofHeader = "x-pilates-proxy-proof";

/** The API trusts the Vercel hop only with the secret; a browser's is dropped. */
export function withProxyProof(
  incoming: Headers,
  secret: string | undefined,
): Headers {
  const headers = new Headers(incoming);
  headers.delete(proxyProofHeader);
  if (secret) {
    headers.set(proxyProofHeader, secret);
  }
  return headers;
}

export default function middleware(request: Request): Response {
  return next({
    request: {
      headers: withProxyProof(
        request.headers,
        process.env.ADMIN_WEB_PROXY_SECRET,
      ),
    },
  });
}
