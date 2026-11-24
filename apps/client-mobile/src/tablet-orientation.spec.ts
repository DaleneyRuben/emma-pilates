import { Dimensions, Platform } from "react-native";
import { unlockAsync } from "expo-screen-orientation";

import { unlockTabletOrientation } from "./tablet-orientation";

jest.mock("expo-screen-orientation", () => ({ unlockAsync: jest.fn(() => Promise.resolve()) }));

function screen(width: number, height: number) {
  jest.spyOn(Dimensions, "get").mockReturnValue({ fontScale: 1, height, scale: 2, width });
}

describe("unlockTabletOrientation", () => {
  const os = Platform.OS;
  afterEach(() => {
    Platform.OS = os;
    jest.restoreAllMocks();
    jest.mocked(unlockAsync).mockClear();
  });

  // Follow-up 289: the manifest keeps phones upright; a tablet turns freely.
  it("unlocks an Android tablet, whichever way it is held", () => {
    Platform.OS = "android";
    screen(1280, 800);

    unlockTabletOrientation();

    expect(unlockAsync).toHaveBeenCalledTimes(1);
  });

  it("leaves an Android phone upright", () => {
    Platform.OS = "android";
    screen(412, 915);

    unlockTabletOrientation();

    expect(unlockAsync).not.toHaveBeenCalled();
  });

  // The iPad's orientations come from its own Info.plist key.
  it("leaves iOS to its Info.plist", () => {
    Platform.OS = "ios";
    screen(834, 1194);

    unlockTabletOrientation();

    expect(unlockAsync).not.toHaveBeenCalled();
  });
});
