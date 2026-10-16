import { act, render } from "@testing-library/react-native";
import { AccessibilityInfo, Animated, Dimensions } from "react-native";

import { LoadingState } from "./loading-state";

// MOB-061, design follow-up 94: a screen's first load shows only the studio's
// logo, centred in the content area, after a short delay, breathing calmly.
describe("LoadingState", () => {
  // An endless loop never settles under fake timers, so the breath itself is
  // a stand-in that records whether it was started and stopped.
  const breath = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    jest.spyOn(Animated, "loop").mockReturnValue(breath);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const advance = async (milliseconds: number) => {
    await act(async () => {
      jest.advanceTimersByTime(milliseconds);
    });
  };

  it("is announced as progress with the screen's label and shows no text", async () => {
    const screen = await render(<LoadingState label="Cargando clases" />);

    const state = screen.getByRole("progressbar", { name: "Cargando clases" });
    expect(state).toBeOnTheScreen();
    expect(state).toHaveStyle({ flex: 1, alignItems: "center", justifyContent: "center" });
    expect(screen.queryByText(/Cargando/)).toBeNull();
  });

  it("shows nothing for the first 400 ms so a fast answer never flashes the logo", async () => {
    const screen = await render(<LoadingState label="Cargando clases" />);

    await advance(399);
    expect(screen.queryByTestId("loading-state-logo")).toBeNull();

    await advance(1);
    expect(screen.getByTestId("loading-state-logo")).toBeOnTheScreen();
  });

  it("draws the logo 240 pt wide on a phone and 300 pt on a tablet", async () => {
    const phone = await render(<LoadingState label="Cargando clases" />);
    await advance(400);
    expect(phone.getByTestId("loading-state-logo")).toHaveStyle({ width: 240, height: 100 });
    await phone.unmount();

    const phoneWindow = Dimensions.get("window");
    const ipad = { width: 834, height: 1194, scale: 2, fontScale: 1 };
    Dimensions.set({ window: ipad, screen: ipad });
    try {
      const tablet = await render(<LoadingState label="Cargando clases" />);
      await advance(400);
      expect(tablet.getByTestId("loading-state-logo")).toHaveStyle({ width: 300, height: 125 });
    } finally {
      Dimensions.set({ window: phoneWindow, screen: phoneWindow });
    }
  });

  it("fades in and then breathes in an endless loop", async () => {
    const screen = await render(<LoadingState label="Cargando clases" />);

    await advance(400);

    expect(screen.getByTestId("loading-state-logo")).toBeOnTheScreen();
    expect(Animated.loop).toHaveBeenCalledTimes(1);
    await advance(300);
    expect(breath.start).toHaveBeenCalled();
  });

  it("appears still at full opacity under Reduce Motion", async () => {
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
    const screen = await render(<LoadingState label="Cargando clases" />);

    await advance(400);

    expect(screen.getByTestId("loading-state-logo")).toHaveStyle({
      opacity: 1,
      transform: [{ scale: 1 }],
    });
    expect(Animated.loop).not.toHaveBeenCalled();
  });

  it("stops its timer and its animation when the content arrives", async () => {
    const clear = jest.spyOn(globalThis, "clearTimeout");
    const early = await render(<LoadingState label="Cargando clases" />);
    await early.unmount();
    expect(clear).toHaveBeenCalled();

    const screen = await render(<LoadingState label="Cargando clases" />);
    await advance(400);

    await advance(300);

    await screen.unmount();

    expect(breath.stop).toHaveBeenCalled();
  });
});
