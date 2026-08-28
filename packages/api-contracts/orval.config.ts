import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: {
      target: "../../apps/backend/openapi/openapi.json",
    },
    output: {
      target: "./src/generated/api.ts",
      schemas: "./src/generated/models",
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      formatter: "prettier",
      override: {
        fetch: {
          useRuntimeFetcher: true,
        },
      },
    },
  },
});
