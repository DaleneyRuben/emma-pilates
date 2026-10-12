const proxyProofHeader = "x-pilates-proxy-proof";

/**
 * ADR-0087: the API trusts the Vercel hop's forwarded address only when this
 * header carries the shared secret. A browser-sent value is always dropped.
 */
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
