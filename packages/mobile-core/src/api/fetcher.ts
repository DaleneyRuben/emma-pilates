type ApiFetcherOptions = {
  baseUrl: string;
  getCredential: () => Promise<string | null>;
  fetch?: typeof globalThis.fetch;
};

function joinApiUrl(baseUrl: string, requestPath: string): string {
  const base = new URL(baseUrl);
  const basePath = base.pathname.replace(/\/$/, "");
  const path = `/${requestPath.replace(/^\//, "")}`;

  if (path === basePath || path.startsWith(`${basePath}/`)) {
    return `${base.origin}${path}`;
  }

  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export function createApiFetcher({
  baseUrl,
  getCredential,
  fetch: fetchImplementation = globalThis.fetch,
}: ApiFetcherOptions): typeof globalThis.fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    const credential = await getCredential();

    if (credential !== null) {
      headers.set("Authorization", `Bearer ${credential}`);
    }

    const path = typeof input === "string" ? input : input.toString();
    const url = joinApiUrl(baseUrl, path);

    return fetchImplementation(url, { ...init, headers });
  };
}
