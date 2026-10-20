import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage } from "node:http";
import { defineConfig, type Plugin } from "vite";
import { forwardEnvelope } from "./api/monitoring/envelope.ts";
import { securityHeaders } from "./security-headers.ts";

// The browser only ever calls /api/v1 on its own origin (ADR-0084). Locally
// the dev server plays the Vercel proxy role and forwards to the backend.
const apiProxyTarget =
  process.env.ADMIN_API_PROXY_TARGET ?? "http://127.0.0.1:3100";

const readBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
};

// The dev server also plays the error tunnel's Vercel Function (EXT-012),
// with the DSN `pnpm dev:admin` was started with.
const errorTunnel = (): Plugin => ({
  name: "pilates-error-tunnel",
  configureServer(server) {
    server.middlewares.use("/api/monitoring/envelope", (req, res) => {
      void (async () => {
        const body = req.method === "POST" ? await readBody(req) : undefined;
        const response = await forwardEnvelope(
          new Request("http://localhost/api/monitoring/envelope", {
            method: req.method,
            body,
          }),
          process.env.VITE_ERROR_REPORTING_DSN,
        );
        res.statusCode = response.status;
        res.end();
      })();
    });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), errorTunnel()],
  // The built app runs under the deployed headers (WEB-030); the dev server
  // does not, since its hot reload injects scripts the policy refuses.
  preview: { headers: securityHeaders },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api/v1": {
        target: apiProxyTarget,
        changeOrigin: false,
      },
    },
  },
});
