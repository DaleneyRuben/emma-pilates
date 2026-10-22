import { render } from "@testing-library/react";
import {
  BodyScrollLock,
  scrollbarGapVariable,
  scrollLockClass,
} from "./body-scroll-lock";

// WEB-037: the overlays lock the page behind them through a body class,
// because Radix's own lock injects a <style> element the
// Content-Security-Policy (WEB-030) refuses.
describe("BodyScrollLock", () => {
  const widths = (inner: number, client: number) => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: inner,
    });
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: client,
    });
  };

  afterEach(() => {
    widths(1024, 0);
  });

  it("adds the class with the hidden scrollbar's width while mounted", () => {
    widths(1440, 1425);
    const { unmount } = render(<BodyScrollLock />);

    expect(document.body).toHaveClass(scrollLockClass);
    expect(document.body.style.getPropertyValue(scrollbarGapVariable)).toBe(
      "15px",
    );

    unmount();
    expect(document.body).not.toHaveClass(scrollLockClass);
    expect(document.body.style.getPropertyValue(scrollbarGapVariable)).toBe("");
  });

  it("keeps the lock until the last overlay is gone", () => {
    const outer = render(<BodyScrollLock />);
    const inner = render(<BodyScrollLock />);

    inner.unmount();
    expect(document.body).toHaveClass(scrollLockClass);

    outer.unmount();
    expect(document.body).not.toHaveClass(scrollLockClass);
  });

  it("measures the scrollbar once, from the first overlay", () => {
    widths(1440, 1425);
    const outer = render(<BodyScrollLock />);
    widths(1440, 1440);
    const inner = render(<BodyScrollLock />);

    expect(document.body.style.getPropertyValue(scrollbarGapVariable)).toBe(
      "15px",
    );

    inner.unmount();
    outer.unmount();
  });
});
