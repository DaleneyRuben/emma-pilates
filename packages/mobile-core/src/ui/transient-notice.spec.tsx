import { act, renderHook } from "@testing-library/react-native";

import { useTransientNotice } from "./transient-notice";

// MOB-052: a notice carried by a navigation param is shown while the param is
// set and the param is cleared once its time is up; nothing is copied into state.
describe("useTransientNotice", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns null without a notice and never dismisses", () => {
    const dismiss = jest.fn();
    const { result } = renderHook(() => useTransientNotice(undefined, 8_000, dismiss));

    expect(result.current).toBeNull();
    act(() => {
      jest.advanceTimersByTime(8_000);
    });
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("returns the notice and dismisses it once its time is up", () => {
    const dismiss = jest.fn();
    const { result } = renderHook(() => useTransientNotice("Pago confirmado", 2_000, dismiss));

    expect(result.current).toBe("Pago confirmado");
    act(() => {
      jest.advanceTimersByTime(1_999);
    });
    expect(dismiss).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("keeps the timer across re-renders and calls the latest dismiss", () => {
    const first = jest.fn();
    const second = jest.fn();
    const notice = { bookingId: "booking-1" };
    const { rerender, result } = renderHook(
      ({ dismiss }) => useTransientNotice(notice, 8_000, dismiss),
      { initialProps: { dismiss: first } },
    );

    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    rerender({ dismiss: second });
    expect(result.current).toBe(notice);
    act(() => {
      jest.advanceTimersByTime(3_000);
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("starts over for a new notice and forgets a notice that goes away", () => {
    const dismiss = jest.fn();
    const { rerender, result } = renderHook(
      ({ notice }) => useTransientNotice(notice, 8_000, dismiss),
      { initialProps: { notice: "first" as string | undefined } },
    );

    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    rerender({ notice: "second" });
    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    expect(result.current).toBe("second");
    expect(dismiss).not.toHaveBeenCalled();
    rerender({ notice: undefined });
    act(() => {
      jest.advanceTimersByTime(8_000);
    });
    expect(result.current).toBeNull();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("clears the timer when the screen unmounts", () => {
    const dismiss = jest.fn();
    const { unmount } = renderHook(() => useTransientNotice("Reserva confirmada", 8_000, dismiss));

    unmount();
    act(() => {
      jest.advanceTimersByTime(8_000);
    });
    expect(dismiss).not.toHaveBeenCalled();
  });
});
