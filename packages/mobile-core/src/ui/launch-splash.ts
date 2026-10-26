import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { AccessibilityInfo } from "react-native";

// Design follow-up 106: the launch screen fades into the first screen.
const fadeMilliseconds = 300;

/**
 * Keeps the platform's launch screen up past the JavaScript load (MOB-068).
 * Call it once at app start, before the root component mounts; in Expo Go
 * and in tests there is no native module and the calls do nothing.
 * UX-019: a person who asked for less motion gets no fade.
 */
export function holdLaunchSplash(): void {
  SplashScreen.setOptions({ fade: true, duration: fadeMilliseconds });
  void AccessibilityInfo.isReduceMotionEnabled()
    .then((reduceMotion) => {
      if (!reduceMotion) return;
      SplashScreen.setOptions({ fade: false, duration: 0 });
    })
    .catch(() => undefined);
  void SplashScreen.preventAutoHideAsync().catch(() => undefined);
}

/** Releases the launch screen once the first screen has rendered, once. */
export function useReleaseLaunchSplash(ready: boolean): void {
  const released = useRef(false);
  useEffect(() => {
    if (!ready || released.current) return;
    released.current = true;
    void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
}
