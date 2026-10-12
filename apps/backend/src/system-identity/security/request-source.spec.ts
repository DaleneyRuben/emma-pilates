import type { Request } from 'express';
import {
  createNetworkAddressMiddleware,
  forwardedEntryCount,
  requestNetworkAddress,
  resolveNetworkAddress,
} from './request-source';

const proofSecret = 'p'.repeat(40);

const request = (
  headers: Record<string, string>,
  directAddress = '10.0.0.9',
): Request =>
  ({ headers, socket: { remoteAddress: directAddress } }) as unknown as Request;

describe('ADR-0087 network address', () => {
  it('uses the direct connection when no proxy is trusted', () => {
    expect(
      resolveNetworkAddress(request({ 'x-forwarded-for': '6.6.6.6' }), {
        trustedProxyHops: 0,
        proxyProofSecret: null,
      }),
    ).toBe('10.0.0.9');
  });

  it('skips only the platform proxies, never what the requester wrote', () => {
    const forged = request({ 'x-forwarded-for': '6.6.6.6, 203.0.113.7' });

    expect(
      resolveNetworkAddress(forged, {
        trustedProxyHops: 1,
        proxyProofSecret: null,
      }),
    ).toBe('203.0.113.7');
  });

  it('trusts the Vercel hop only with the matching proof', () => {
    const headers = {
      'x-forwarded-for': '198.51.100.4, 76.76.21.1',
      'x-pilates-proxy-proof': proofSecret,
    };
    const policy = { trustedProxyHops: 1, proxyProofSecret: proofSecret };

    expect(resolveNetworkAddress(request(headers), policy)).toBe(
      '198.51.100.4',
    );
    expect(
      resolveNetworkAddress(
        request({ ...headers, 'x-pilates-proxy-proof': 'q'.repeat(40) }),
        policy,
      ),
    ).toBe('76.76.21.1');
    expect(
      resolveNetworkAddress(request(headers), {
        trustedProxyHops: 1,
        proxyProofSecret: null,
      }),
    ).toBe('76.76.21.1');
  });

  it('takes the leftmost entry when the chain is shorter than the hops', () => {
    expect(
      resolveNetworkAddress(request({ 'x-forwarded-for': '203.0.113.7' }), {
        trustedProxyHops: 3,
        proxyProofSecret: null,
      }),
    ).toBe('203.0.113.7');
  });

  it('counts forwarded entries without reading them', () => {
    expect(forwardedEntryCount(request({}))).toBe(0);
    expect(
      forwardedEntryCount(request({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2' })),
    ).toBe(2);
  });

  it('hands the resolved address to the throttling callers', () => {
    const forwarded = request({ 'x-forwarded-for': '203.0.113.7' });
    const next = jest.fn();

    createNetworkAddressMiddleware({
      trustedProxyHops: 1,
      proxyProofSecret: null,
    })(forwarded, {} as never, next);

    expect(next).toHaveBeenCalled();
    expect(requestNetworkAddress(forwarded)).toBe('203.0.113.7');
    expect(requestNetworkAddress(request({}))).toBe('10.0.0.9');
  });
});
