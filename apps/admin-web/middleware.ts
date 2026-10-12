import { next } from "@vercel/functions";
import { withProxyProof } from "./src/vercel/proxy-proof.ts";

// Vercel Routing Middleware: runs before vercel.json's /api/v1 rewrite, so the
// forwarded request carries the proof the API checks (ADR-0087).
export const config = { matcher: "/api/v1/:path*" };

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
