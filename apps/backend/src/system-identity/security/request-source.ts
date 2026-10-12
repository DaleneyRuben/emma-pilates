import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { forwardedEntries } from '../../http/forwarded-for';

/** Who a request comes from, as ADR-0029's origin throttling sees it. */
export type RequestSource = {
  clientIdentifier: string | null;
  networkAddress: string;
};

/** ADR-0087: which forwarding proxies this environment trusts. */
export type ForwardingPolicy = {
  trustedProxyHops: number;
  proxyProofSecret: string | null;
};

const clientIdentifierPattern = /^[A-Za-z0-9_-]{16,128}$/;
const proxyProofHeader = 'x-pilates-proxy-proof';

/** A malformed identifier counts as missing, so it falls back to the network. */
export const parseClientIdentifier = (value: unknown): string | null =>
  typeof value === 'string' && clientIdentifierPattern.test(value)
    ? value
    : null;

// Express `trust proxy` stays unset, so `request.ip` is the direct connection.
const directAddress = (request: Request): string =>
  request.ip ?? request.socket?.remoteAddress ?? 'unknown';

const hasProxyProof = (request: Request, secret: string | null): boolean => {
  const proof = request.headers[proxyProofHeader];
  if (secret === null || typeof proof !== 'string') {
    return false;
  }
  const expected = Buffer.from(secret);
  const presented = Buffer.from(proof);
  return (
    presented.length === expected.length && timingSafeEqual(presented, expected)
  );
};

// Entries left of the trusted hops were written by the requester or by an
// untrusted proxy, so they are never read.
export const resolveNetworkAddress = (
  request: Request,
  policy: ForwardingPolicy,
): string => {
  const chain = [...forwardedEntries(request), directAddress(request)];
  const hops =
    policy.trustedProxyHops +
    (hasProxyProof(request, policy.proxyProofSecret) ? 1 : 0);
  return chain[Math.max(chain.length - 1 - hops, 0)];
};

const resolvedAddresses = new WeakMap<Request, string>();

export const createNetworkAddressMiddleware =
  (policy: ForwardingPolicy) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    resolvedAddresses.set(request, resolveNetworkAddress(request, policy));
    next();
  };

export const requestNetworkAddress = (request: Request): string =>
  resolvedAddresses.get(request) ?? directAddress(request);

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
