type MatchMedia = typeof window.matchMedia;

// The shell asks matchMedia("(max-width: 1023px)"); answer true to render the
// narrow-browser layout (hamburger drawer, bottom sheets) for one test.
export function useNarrowViewport(): void {
  let original: MatchMedia;

  beforeEach(() => {
    original = window.matchMedia;
    window.matchMedia = (query: string): MediaQueryList => ({
      matches: query.includes("max-width"),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    });
  });

  afterEach(() => {
    window.matchMedia = original;
  });
}
