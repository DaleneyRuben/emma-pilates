import { BadRequestException } from '@nestjs/common';
import { DevicesController } from './devices.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};
const body = {
  installationId: '3f0d4c1e-7c1b-4a8e-9a55-5d7c3b2a1f00',
  expoPushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  platform: 'ios',
};

describe('DevicesController', () => {
  const resolvePrincipal = jest.fn().mockResolvedValue(principal);
  const register = jest.fn().mockResolvedValue(undefined);
  const deactivate = jest.fn().mockResolvedValue(undefined);
  const controller = new DevicesController(
    register,
    deactivate,
    resolvePrincipal,
  );

  beforeEach(() => {
    register.mockClear();
    deactivate.mockClear();
  });

  it('registers the current device for the authenticated session', async () => {
    await controller.registerCurrent(bearer, body);

    expect(register).toHaveBeenCalledWith({
      accountId: 'account-id',
      authenticationSessionId: 'authentication-session-id',
      installationId: body.installationId,
      expoPushToken: body.expoPushToken,
      platform: 'ios',
    });
  });

  it('accepts the older ExpoPushToken prefix', async () => {
    await controller.registerCurrent(bearer, {
      ...body,
      expoPushToken: 'ExpoPushToken[yyyyyyyyyyyyyyyyyyyyyy]',
      platform: 'android',
    });

    expect(register).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a missing token', { ...body, expoPushToken: undefined }],
    ['a raw FCM token', { ...body, expoPushToken: 'fcm-token-value' }],
    ['an unknown platform', { ...body, platform: 'web' }],
    ['a short installation id', { ...body, installationId: 'abc' }],
    ['an extra field', { ...body, accountId: 'other-account' }],
  ])('rejects %s', async (_label, invalid) => {
    await expect(
      controller.registerCurrent(bearer, invalid),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(register).not.toHaveBeenCalled();
  });

  it('deactivates the current device when permission is revoked', async () => {
    await controller.deactivateCurrent(bearer, {
      installationId: body.installationId,
    });

    expect(deactivate).toHaveBeenCalledWith({
      accountId: 'account-id',
      installationId: body.installationId,
    });
  });

  it('rejects a deactivation without an installation id', async () => {
    await expect(
      controller.deactivateCurrent(bearer, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
