import "@testing-library/jest-dom";
import { configure } from "@testing-library/dom";

// Every spec renders the whole app; on a cold parallel worker the first
// render can outlast Testing Library's one-second default lookup.
configure({ asyncUtilTimeout: 3_000 });

// WEB-018, as MOB-054 does in the mobile setups: a React act() warning fails
// the spec that let it through instead of scrolling past in the output. The
// warning is still printed, so the failing spec shows which update landed
// outside an act scope.
const actWarnings: string[] = [];
const reportError = console.error;
console.error = (...args: unknown[]) => {
  reportError(...args);
  const message = String(args[0]).replace("%s", String(args[1]));
  if (
    /not wrapped in act|not configured to support act|overlapping act/.test(
      message,
    )
  ) {
    actWarnings.push(message.split("\n")[0] ?? message);
  }
};
afterEach(() => {
  expect(actWarnings.splice(0)).toEqual([]);
});
afterAll(() => {
  expect(actWarnings).toEqual([]);
});

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

// jsdom has no object URLs and its Blob cannot hand back its bytes; the
// image field previews a chosen file through one and the upload module
// reads the file's bytes through the other.
if (typeof URL.createObjectURL !== "function") {
  let objectUrls = 0;
  Object.defineProperty(URL, "createObjectURL", {
    writable: true,
    value: (blob: Blob): string =>
      `blob:test/${objectUrls++}/${blob instanceof File ? blob.name : "blob"}`,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    writable: true,
    value: () => undefined,
  });
}
if (typeof Blob.prototype.arrayBuffer !== "function") {
  Object.defineProperty(Blob.prototype, "arrayBuffer", {
    writable: true,
    value: function readBytes(this: Blob): Promise<ArrayBuffer> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(this);
      });
    },
  });
}
