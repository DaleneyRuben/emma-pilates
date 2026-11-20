import { act, renderHook } from "@testing-library/react-native";

import { useMinuteClock } from "./use-minute-clock";

// Review of E6: «Empieza en N min» counts down while the roster stays open.
describe("useMinuteClock", () => {
  afterEach(() => jest.restoreAllMocks());

  it("reads the time again every half minute and stops when unmounted", async () => {
    const ticks: (() => void)[] = [];
    jest.spyOn(globalThis, "setInterval").mockImplementation(((
      callback: () => void,
      ms?: number,
    ) => {
      expect(ms).toBe(30_000);
      ticks.push(callback);
      return 7 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);
    const cleared = jest.spyOn(globalThis, "clearInterval").mockImplementation(() => undefined);
    const start = Date.now();
    const { result, unmount } = await renderHook(() => useMinuteClock());

    jest.spyOn(Date, "now").mockReturnValue(start + 60_000);
    await act(async () => ticks[0]!());

    expect(result.current.getTime()).toBe(start + 60_000);
    await unmount();
    expect(cleared).toHaveBeenCalledWith(7);
  });
});
