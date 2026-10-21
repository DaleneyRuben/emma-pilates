import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { serverStdio, stopChild } from "./child-process";
import {
  adminDatabaseUrl,
  apiOrigin,
  apiPort,
  webOrigin,
  webPort,
} from "./environment";

const adminWebRoot = resolve(import.meta.dirname, "../..");
const backendRoot = resolve(adminWebRoot, "../backend");
const disposablePrefix = "pilates_test_";

const databaseName = (url: string) => new URL(url).pathname.slice(1);

const runSql = (statement: string) =>
  execFileSync(
    "psql",
    [adminDatabaseUrl, "-v", "ON_ERROR_STOP=1", "-c", statement],
    {
      stdio: "pipe",
    },
  );

// Every backend process gets the disposable database explicitly: the
// backend's own .env points elsewhere and must never be used here.
const backendEnvironment = (databaseUrl: string): NodeJS.ProcessEnv => ({
  ...process.env,
  DATABASE_URL: databaseUrl,
  NODE_ENV: "development",
  PORT: String(apiPort),
  ADMIN_WEB_TRUSTED_ORIGINS: webOrigin,
});

const waitFor = async (url: string, what: string): Promise<void> => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }
    await sleep(250);
  }
  throw new Error(`${what} did not answer at ${url} within 60 s`);
};

export default async function globalSetup(): Promise<() => Promise<void>> {
  if (!databaseName(adminDatabaseUrl).startsWith(disposablePrefix)) {
    throw new Error(
      `TEST_DATABASE_URL must target a database named ${disposablePrefix}*`,
    );
  }
  const name = `${disposablePrefix}${randomBytes(6).toString("hex")}`;
  const databaseUrl = new URL(adminDatabaseUrl);
  databaseUrl.pathname = `/${name}`;
  runSql(`create database "${name}"`);
  const dropDatabase = () =>
    runSql(`drop database if exists "${name}" with (force)`);

  let api: ChildProcess | undefined;
  let worker: ChildProcess | undefined;
  let web: ChildProcess | undefined;
  try {
    const environment = backendEnvironment(databaseUrl.toString());
    execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
      cwd: backendRoot,
      env: environment,
      stdio: "pipe",
    });
    execFileSync("node", ["dist/src/development-fixtures-main.js"], {
      cwd: backendRoot,
      env: environment,
      stdio: "pipe",
    });

    api = spawn("node", ["dist/src/main.js"], {
      cwd: backendRoot,
      env: environment,
      stdio: serverStdio(adminWebRoot, "e2e-backend"),
    });
    // The worker turns a transfer receipt into variants (WEB-034's payment
    // journeys seed one) and captures the invitation email locally.
    worker = spawn("node", ["dist/src/worker-main.js"], {
      cwd: backendRoot,
      env: environment,
      stdio: serverStdio(adminWebRoot, "e2e-worker"),
    });
    web = spawn(
      "node",
      [
        "node_modules/vite/bin/vite.js",
        "preview",
        "--port",
        String(webPort),
        "--strictPort",
      ],
      {
        cwd: adminWebRoot,
        env: { ...process.env, ADMIN_API_PROXY_TARGET: apiOrigin },
        stdio: serverStdio(adminWebRoot, "e2e-preview"),
      },
    );
    await waitFor(`${apiOrigin}/health/ready`, "The backend");
    await waitFor(`${webOrigin}/`, "The preview server");
    console.log(
      `e2e: backend pid ${api.pid} on ${apiOrigin}, worker pid ${worker.pid}, preview pid ${web.pid} on ${webOrigin}, database ${name}; stderr under test-results/ (E2E_DEBUG=1 prints it here)`,
    );
  } catch (error) {
    await stopChild(web);
    await stopChild(worker);
    await stopChild(api);
    dropDatabase();
    throw error;
  }

  return async () => {
    await stopChild(web);
    await stopChild(worker);
    await stopChild(api);
    dropDatabase();
    console.log(`e2e: stopped the three servers and dropped database ${name}`);
  };
}
