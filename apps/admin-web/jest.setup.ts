import "@testing-library/jest-dom";
import { configure } from "@testing-library/dom";

// Every spec renders the whole app; on a cold parallel worker the first
// render can outlast Testing Library's one-second default lookup.
configure({ asyncUtilTimeout: 3_000 });

// jsdom has no matchMedia; the shell treats a missing implementation as the
// desktop layout, and narrow-width tests install their own stub.
if (typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

// Radix measures triggers with ResizeObserver, which jsdom does not ship.
if (typeof window.ResizeObserver !== "function") {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: ResizeObserverStub,
  });
}

// The router restores scroll positions through window.scrollTo, which jsdom
// reports as not implemented.
Object.defineProperty(window, "scrollTo", { writable: true, value: () => {} });
