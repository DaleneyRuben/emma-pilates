import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import { createMemoryPushPlatform } from "./memory-push-platform";
import { useClearBadgeWithoutSession } from "./no-session-badge";

// Owner, TestFlight 1.3.0: after signing out, a push the server still sent set
// the icon's badge with nobody signed in.
describe("useClearBadgeWithoutSession", () => {
  let appStateListener: ((state: AppStateStatus) => void) | undefined;

  beforeEach(() => {
    appStateListener = undefined;
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
      appStateListener = listener as (state: AppStateStatus) => void;
      return { remove: jest.fn() };
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it("clears the badge when the app opens with no session", async () => {
    const device = createMemoryPushPlatform();

    await renderHook(() =>
      useClearBadgeWithoutSession({ platform: device.platform, signedIn: false }),
    );

    expect(device.state.badgeCounts).toEqual([0]);
  });

  it("clears it again each time the app comes back and when a push arrives", async () => {
    const device = createMemoryPushPlatform();
    await renderHook(() =>
      useClearBadgeWithoutSession({ platform: device.platform, signedIn: false }),
    );

    await act(() => appStateListener?.("active"));
    await act(() => device.receive());

    expect(device.state.badgeCounts).toEqual([0, 0, 0]);
  });

  it("clears it once the person signs out", async () => {
    const device = createMemoryPushPlatform();
    const { rerender } = await renderHook(
      ({ signedIn }: { signedIn: boolean }) =>
        useClearBadgeWithoutSession({ platform: device.platform, signedIn }),
      { initialProps: { signedIn: true } },
    );
    expect(device.state.badgeCounts).toEqual([]);

    await rerender({ signedIn: false });

    expect(device.state.badgeCounts).toEqual([0]);
  });

  it("leaves the badge to the unread count while signed in", async () => {
    const device = createMemoryPushPlatform();
    await renderHook(() =>
      useClearBadgeWithoutSession({ platform: device.platform, signedIn: true }),
    );

    await act(() => appStateListener?.("active"));
    await act(() => device.receive());

    expect(device.state.badgeCounts).toEqual([]);
  });
});
