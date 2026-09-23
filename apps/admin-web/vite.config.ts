import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The browser only ever calls /api/v1 on its own origin (ADR-0084). Locally
// the dev server plays the Vercel proxy role and forwards to the backend.
const apiProxyTarget =
  process.env.ADMIN_API_PROXY_TARGET ?? "http://127.0.0.1:3100";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
