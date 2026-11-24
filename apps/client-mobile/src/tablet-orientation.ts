import { unlockAsync } from "expo-screen-orientation";
import { useEffect } from "react";
import { AppState, Dimensions, Platform } from "react-native";

// Android's own tablet line: a screen whose shorter side is at least 600 dp.
const androidTabletShortestSide = 600;

/**
 * Follow-up 289: tablets turn freely while phones stay upright. iOS says so
 * in Info.plist per device; Android's manifest locks every size upright, so
 * an Android tablet lifts the lock at launch.
 */
export function unlockTabletOrientation() {
  if (Platform.OS !== "android") return;
  const { height, width } = Dimensions.get("screen");
  if (Math.min(width, height) < androidTabletShortestSide) return;
  void unlockAsync().catch(() => undefined);
}

/**
 * Lifts the lock whenever Android may have put it back: on mount (a new
 * activity after Back re-reads the manifest), on returning to the
 * foreground, and when the screen changes size (a foldable opening).
 */
export function useTabletOrientation() {
  useEffect(() => {
    unlockTabletOrientation();
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") unlockTabletOrientation();
    });
    const resized = Dimensions.addEventListener("change", unlockTabletOrientation);
    return () => {
      foreground.remove();
      resized.remove();
    };
  }, []);
}
