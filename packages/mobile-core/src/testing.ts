// Test-only entry point (`@pilates/mobile-core/testing`): Jest setup files load
// it without the package's runtime, so a spec's own jest.mock still reaches
// every module the package imports.
import { offScaleTexts, type RenderedNode } from "./ui/type-scale-audit";

export { offScaleTexts };

type TestingLibrary = {
  cleanup: () => Promise<void> | void;
  screen: { toJSON: () => unknown };
};

/**
 * RNTL with a `cleanup` that first checks every text still on screen against
 * the Rosa Emma type scale (follow-up 285), then unmounts, then fails on any
 * text off the scale. Every unmount goes through it: a spec's own
 * `afterEach(cleanup)` as much as the setup's. Mock RNTL with it in a Jest
 * setup file, with `RNTL_SKIP_AUTO_CLEANUP` set, and call `cleanup` from an
 * `afterEach` there.
 */
export function withTypeScaleAudit<Library extends TestingLibrary>(actual: Library): Library {
  async function cleanup() {
    let rendered: RenderedNode | RenderedNode[] | null = null;
    try {
      // RNTL replaces `screen` on every render, so read it now.
      rendered = actual.screen.toJSON() as RenderedNode | RenderedNode[] | null;
    } catch {
      // Nothing rendered, or already unmounted.
    }
    await actual.cleanup();
    const off = offScaleTexts(rendered);
    if (off.length > 0) {
      throw new Error(`Text off the Rosa Emma type scale (follow-up 285):\n${off.join("\n")}`);
    }
  }
  return new Proxy(actual, {
    get: (target, key) => (key === "cleanup" ? cleanup : target[key as keyof Library]),
  });
}
