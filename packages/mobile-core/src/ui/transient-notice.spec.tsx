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

  it("returns null without a notice and never dismisses", async () => {
    const dismiss = jest.fn();
    const { result } = await renderHook(() => useTransientNotice(undefined, 8_000, dismiss));

    expect(result.current).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(8_000);
    });
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("returns the notice and dismisses it once its time is up", async () => {
    const dismiss = jest.fn();
    const { result } = await renderHook(() =>
      useTransientNotice("Pago confirmado", 2_000, dismiss),
    );

    expect(result.current).toBe("Pago confirmado");
    await act(async () => {
      jest.advanceTimersByTime(1_999);
    });
    expect(dismiss).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("keeps the timer across re-renders and calls the latest dismiss", async () => {
    const first = jest.fn();
    const second = jest.fn();
    const notice = { bookingId: "booking-1" };
    const { rerender, result } = await renderHook(
      ({ dismiss }: { dismiss: () => void }) => useTransientNotice(notice, 8_000, dismiss),
      { initialProps: { dismiss: first } },
    );

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
    await rerender({ dismiss: second });
    expect(result.current).toBe(notice);
    await act(async () => {
      jest.advanceTimersByTime(3_000);
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("starts over for a new notice and forgets a notice that goes away", async () => {
    const dismiss = jest.fn();
    const { rerender, result } = await renderHook(
      ({ notice }: { notice: string | undefined }) => useTransientNotice(notice, 8_000, dismiss),
      { initialProps: { notice: "first" } },
    );

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
    await rerender({ notice: "second" });
    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
    expect(result.current).toBe("second");
    expect(dismiss).not.toHaveBeenCalled();
    await rerender({ notice: undefined });
    await act(async () => {
      jest.advanceTimersByTime(8_000);
    });
    expect(result.current).toBeNull();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("clears the timer when the screen unmounts", async () => {
    const dismiss = jest.fn();
    const { unmount } = await renderHook(() =>
      useTransientNotice("Reserva confirmada", 8_000, dismiss),
    );

    await unmount();
    await act(async () => {
      jest.advanceTimersByTime(8_000);
    });
    expect(dismiss).not.toHaveBeenCalled();
  });
});
