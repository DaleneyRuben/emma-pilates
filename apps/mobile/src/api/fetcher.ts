type ApiFetcherOptions = {
  baseUrl: string;
  getCredential: () => Promise<string | null>;
  fetch?: typeof globalThis.fetch;
};

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
    const url = `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

    return fetchImplementation(url, { ...init, headers });
  };
}
