// A Vercel Function: the admin web's error events reach Better Stack through
// the page's own origin, so content blockers that refuse the ingest host
// let them through (EXT-012). It imports nothing local, like middleware.ts.

const maxEnvelopeBytes = 64 * 1024;

type Dsn = {
  protocol: string;
  host: string;
  path: string;
  publicKey: string;
};

const parseDsn = (value: unknown): Dsn | undefined => {
  if (typeof value !== "string" || !URL.canParse(value)) {
    return undefined;
  }
  const url = new URL(value);
  return {
    protocol: url.protocol,
    host: url.host,
    path: url.pathname.replace(/\/+$/, ""),
    publicKey: url.username,
  };
};

const sameDsn = (a: Dsn, b: Dsn) =>
  a.protocol === b.protocol &&
  a.host === b.host &&
  a.path === b.path &&
  a.publicKey === b.publicKey;

// The URL the SDK posts to without a tunnel: the DSN's path ends in the
// project id.
const ingestUrl = ({ protocol, host, path, publicKey }: Dsn) => {
  const projectAt = path.lastIndexOf("/");
  const prefix = path.slice(0, projectAt);
  const project = path.slice(projectAt + 1);
  const query = new URLSearchParams({
    sentry_key: publicKey,
    sentry_version: "7",
  });
  return `${protocol}//${host}${prefix}/api/${project}/envelope/?${query}`;
};

const envelopeDsn = (envelope: string): unknown => {
  try {
    const header: unknown = JSON.parse(envelope.split("\n", 1)[0] ?? "");
    return typeof header === "object" && header !== null && "dsn" in header
      ? header.dsn
      : undefined;
  } catch {
    return undefined;
  }
};

const answer = (status: number) => new Response(null, { status });

/**
 * Forwards an envelope only to the configured DSN, never to one the request
 * names, so the tunnel is not an open relay. Only the body leaves: no
 * cookies, headers, or client address.
 */
export async function forwardEnvelope(
  request: Request,
  configuredDsn: string | undefined,
  send: typeof fetch = fetch,
): Promise<Response> {
  const target = parseDsn(configuredDsn);
  if (target === undefined) {
    return answer(404);
  }
  if (request.method !== "POST") {
    return answer(405);
  }
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > maxEnvelopeBytes) {
    return answer(413);
  }
  const envelope = new TextDecoder().decode(bytes);
  const addressed = parseDsn(envelopeDsn(envelope));
  if (addressed === undefined) {
    return answer(400);
  }
  if (!sameDsn(addressed, target)) {
    return answer(403);
  }
  try {
    const ingest = await send(ingestUrl(target), {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope" },
      body: envelope,
    });
    return answer(ingest.status);
  } catch {
    return answer(502);
  }
}

// Set on Vercel Production only (EXT-011), so previews answer 404.
export function POST(request: Request): Promise<Response> {
  return forwardEnvelope(request, process.env.VITE_ERROR_REPORTING_DSN);
}
