import type { Request } from 'express';

/** Who a request comes from, as ADR-0029's origin throttling sees it. */
export type RequestSource = {
  clientIdentifier: string | null;
  networkAddress: string;
};

const clientIdentifierPattern = /^[A-Za-z0-9_-]{16,128}$/;

/** A malformed identifier counts as missing, so it falls back to the network. */
export const parseClientIdentifier = (value: unknown): string | null =>
  typeof value === 'string' && clientIdentifierPattern.test(value)
    ? value
    : null;

// Express `trust proxy` is unset: the direct connection, never a forwarded
// header the requester supplied.
export const requestNetworkAddress = (request: Request): string =>
  request.ip ?? request.socket.remoteAddress ?? 'unknown';

export const sourceDigests = (
  source: RequestSource,
  digestSignal: (value: string) => Uint8Array,
): { clientDigest: Uint8Array | null; networkDigest: Uint8Array } => ({
  clientDigest:
    source.clientIdentifier === null
      ? null
      : digestSignal(`client:${source.clientIdentifier}`),
  networkDigest: digestSignal(`network:${source.networkAddress}`),
});
