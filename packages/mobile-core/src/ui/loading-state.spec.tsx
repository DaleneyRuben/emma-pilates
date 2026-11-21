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

  // Follow-up 286 (Rosa Emma, option A): the logo on a soft Rosa 50 halo over
  // the screen's Rosa 100, 240 pt wide on a phone and 300 on a tablet, the halo
  // 1.25 times the logo's width.
  it("draws the logo on a soft halo, larger on a tablet", async () => {
    const phone = await render(<LoadingState label="Cargando clases" />);
    await advance(400);
    const halo = phone.getByTestId("loading-state-halo");
    expect(halo).toHaveStyle({ borderRadius: 150, height: 300, width: 300 });
    expect(halo.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          experimental_backgroundImage:
            "radial-gradient(circle, #FEF6F2 0%, #FEF6F2 45%, rgba(254, 246, 242, 0) 70%)",
        }),
      ]),
    );
    expect(halo).not.toHaveStyle({ backgroundColor: "#FFFBFB" });
    expect(phone.getByTestId("loading-state-logo")).toHaveStyle({ width: 240, height: 103 });
    await phone.unmount();

    const phoneWindow = Dimensions.get("window");
    const ipad = { width: 834, height: 1194, scale: 2, fontScale: 1 };
    Dimensions.set({ window: ipad, screen: ipad });
    try {
      const tablet = await render(<LoadingState label="Cargando clases" />);
      await advance(400);
      expect(tablet.getByTestId("loading-state-halo")).toHaveStyle({ width: 375 });
      expect(tablet.getByTestId("loading-state-logo")).toHaveStyle({ width: 300, height: 129 });
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

    // The halo and the logo breathe as one piece, so both stand still together.
    expect(screen.getByTestId("loading-state-halo")).toHaveStyle({
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
