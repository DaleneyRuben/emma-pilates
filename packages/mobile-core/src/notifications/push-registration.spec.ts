import { syncPushRegistration } from "./push-registration";
import type { PushPlatform } from "./push-platform";

const installationId = "3f0d4c1e-7c1b-4a8e-9a55-5d7c3b2a1f00";

function platform(overrides: Partial<PushPlatform> = {}): PushPlatform {
  return {
    os: "android",
    getPermissionStatus: jest.fn().mockResolvedValue("granted"),
    requestPermission: jest.fn(),
    prepareChannels: jest.fn().mockResolvedValue(undefined),
    getPushToken: jest.fn().mockResolvedValue("ExponentPushToken[abc]"),
    onPushTokenChange: jest.fn(),
    onNotificationReceived: jest.fn(),
    onNotificationTap: jest.fn(),
    takeLaunchTap: jest.fn(),
    setBadgeCount: jest.fn(),
    openSettings: jest.fn(),
    ...overrides,
  };
}

const respond = (status: number) => jest.fn().mockResolvedValue(new Response(null, { status }));

describe("syncPushRegistration", () => {
  it("registers the installation's token once permission is granted", async () => {
    const fetcher = respond(204);
    const device = platform();

    await expect(
      syncPushRegistration({
        fetcher,
        installationId: async () => installationId,
        platform: device,
      }),
    ).resolves.toBe("registered");

    expect(device.prepareChannels).toHaveBeenCalled();
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/notifications/devices/current");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({
      installationId,
      expoPushToken: "ExponentPushToken[abc]",
      platform: "android",
    });
  });

  it("deactivates the installation once permission is denied", async () => {
    const fetcher = respond(204);

    await expect(
      syncPushRegistration({
        fetcher,
        installationId: async () => installationId,
        platform: platform({ getPermissionStatus: jest.fn().mockResolvedValue("denied") }),
      }),
    ).resolves.toBe("deactivated");

    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/notifications/devices/current/deactivate");
    expect(JSON.parse(init.body as string)).toEqual({ installationId });
  });

  it("does nothing until the person has been asked", async () => {
    const fetcher = respond(204);

    await expect(
      syncPushRegistration({
        fetcher,
        installationId: async () => installationId,
        platform: platform({ getPermissionStatus: jest.fn().mockResolvedValue("undetermined") }),
      }),
    ).resolves.toBe("undetermined");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reports a failure when no token can be had, as on a Simulator without APNs", async () => {
    const fetcher = respond(204);

    await expect(
      syncPushRegistration({
        fetcher,
        installationId: async () => installationId,
        platform: platform({ getPushToken: jest.fn().mockRejectedValue(new Error("no aps")) }),
      }),
    ).resolves.toBe("failed");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reports a failure when the API refuses the registration", async () => {
    await expect(
      syncPushRegistration({
        fetcher: respond(503),
        installationId: async () => installationId,
        platform: platform(),
      }),
    ).resolves.toBe("failed");
  });
});
