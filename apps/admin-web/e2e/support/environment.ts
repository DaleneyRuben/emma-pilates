import { userInfo } from "node:os";

// The ports and database the suite owns; none is the dev server's (3100,
// 5173) so a running development backend is never disturbed.
export const apiPort = Number(process.env.E2E_API_PORT ?? 3101);
export const webPort = Number(process.env.E2E_WEB_PORT ?? 4173);
export const apiOrigin = `http://127.0.0.1:${apiPort}`;
export const webOrigin = `http://localhost:${webPort}`;

/**
 * A `pilates_test_*` admin database on the local server, like the
 * backend's integration suite; every run creates its own database beside
 * it and drops it at the end.
 */
export const adminDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  `postgresql://${userInfo().username}@localhost:5432/pilates_test_fixtures`;

export const fixtures = {
  administrator: {
    email: "paola.mendoza@example.com",
    name: "Paola Mendoza",
  },
  assistant: { email: "camila.rojas@example.com" },
  password: "emma-local-2026",
} as const;
