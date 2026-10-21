import { renderHook } from "@testing-library/react-native";
import * as SplashScreen from "expo-splash-screen";

import { holdLaunchSplash, useReleaseLaunchSplash } from "./launch-splash";

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  setOptions: jest.fn(),
}));

const mocked = SplashScreen as jest.Mocked<typeof SplashScreen>;

// MOB-068 (design follow-up 106): the platform's launch screen stays up until
// the first screen is ready, then fades out over 300 ms.
describe("launch splash", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("holds the launch screen with a 300 ms fade", () => {
    holdLaunchSplash();

    expect(mocked.setOptions).toHaveBeenCalledWith({ fade: true, duration: 300 });
    expect(mocked.preventAutoHideAsync).toHaveBeenCalledTimes(1);
  });

  it("keeps holding while the first screen is not ready", () => {
    renderHook(() => useReleaseLaunchSplash(false));

    expect(mocked.hideAsync).not.toHaveBeenCalled();
  });

  it("releases it once the first screen is ready, and only once", () => {
    const hook = renderHook(({ ready }) => useReleaseLaunchSplash(ready), {
      initialProps: { ready: false },
    });

    hook.rerender({ ready: true });
    expect(mocked.hideAsync).toHaveBeenCalledTimes(1);

    hook.rerender({ ready: false });
    hook.rerender({ ready: true });
    expect(mocked.hideAsync).toHaveBeenCalledTimes(1);
  });

  it("swallows a platform that cannot hold or hide the launch screen", async () => {
    mocked.preventAutoHideAsync.mockRejectedValueOnce(new Error("no native module"));
    mocked.hideAsync.mockRejectedValueOnce(new Error("already hidden"));

    expect(() => holdLaunchSplash()).not.toThrow();
    renderHook(() => useReleaseLaunchSplash(true));
    await Promise.resolve();

    expect(mocked.hideAsync).toHaveBeenCalledTimes(1);
  });
});
