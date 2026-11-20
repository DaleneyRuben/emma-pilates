// Test-only entry point (`@pilates/mobile-core/testing`): Jest setup files load
// it without the package's runtime, so a spec's own jest.mock still reaches
// every module the package imports.
import { offScaleTexts, type RenderedNode } from "./ui/type-scale-audit";

export { offScaleTexts };

type Cleanup = () => Promise<void> | void;
type Screen = { toJSON: () => unknown };
/** RNTL replaces `screen` on every render, so the hook reads it late. */
type CurrentScreen = () => Screen;

/**
 * After every spec, before RNTL unmounts it, checks every text the spec left
 * on screen against the Rosa Emma type scale (follow-up 285). Load RNTL with
 * `RNTL_SKIP_AUTO_CLEANUP` set, and pass its `cleanup` and a reader of its `screen` here: this
 * hook audits, then cleans up, so a failing audit still unmounts the tree.
 */
export function auditTypeScaleAfterEach(cleanup: Cleanup, currentScreen: CurrentScreen) {
  afterEach(async () => {
    let rendered: RenderedNode | RenderedNode[] | null = null;
    try {
      rendered = currentScreen().toJSON() as RenderedNode | RenderedNode[] | null;
    } catch {
      // Nothing rendered, or the spec unmounted it already.
    }
    await cleanup();
    expect(offScaleTexts(rendered)).toEqual([]);
  });
}
