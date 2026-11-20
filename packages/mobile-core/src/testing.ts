// Test-only entry point (`@pilates/mobile-core/testing`): Jest setup files load
// it without the package's runtime, so a spec's own jest.mock still reaches
// every module the package imports.
import { offScaleTexts, type RenderedNode } from "./ui/type-scale-audit";

export { offScaleTexts };

type Rendered = RenderedNode | RenderedNode[] | null;
type Mounted = { toJSON: () => unknown; unmount: () => Promise<void> | void };

type TestingLibrary = {
  cleanup: () => Promise<void> | void;
  // RNTL's render takes an element and options; the audit only wraps it.
  render: (...args: never[]) => Promise<Mounted>;
  screen: { toJSON: () => unknown };
};

function snapshot(read: () => unknown): Rendered {
  try {
    return read() as Rendered;
  } catch {
    // Nothing rendered, or already unmounted.
    return null;
  }
}

function failOn(trees: Rendered[]) {
  const off = [...new Set(trees.flatMap(offScaleTexts))];
  if (off.length > 0) {
    throw new Error(`Text off the Rosa Emma type scale (follow-up 285):\n${off.join("\n")}`);
  }
}

/**
 * RNTL that checks every text against the Rosa Emma type scale (follow-up
 * 285) before a tree unmounts: each tree a spec rendered, when the spec
 * unmounts it itself or when `cleanup` runs (a spec's own
 * `afterEach(cleanup)` as much as the setup's). States a spec passes through
 * on the way are not checked, only each tree as it is left. Mock RNTL with it
 * in a Jest setup file, with `RNTL_SKIP_AUTO_CLEANUP` set, and call `cleanup`
 * from an `afterEach` there.
 */
export function withTypeScaleAudit<Library extends TestingLibrary>(actual: Library): Library {
  const open = new Set<Mounted>();

  async function render(...args: never[]) {
    const view = await actual.render(...args);
    open.add(view);
    const unmount = async () => {
      const tree = snapshot(view.toJSON);
      open.delete(view);
      await view.unmount();
      failOn([tree]);
    };
    return { ...view, unmount };
  }

  async function cleanup() {
    const trees = [
      snapshot(actual.screen.toJSON),
      ...[...open].map((view) => snapshot(view.toJSON)),
    ];
    open.clear();
    await actual.cleanup();
    failOn(trees);
  }

  return new Proxy(actual, {
    get: (target, key) => {
      if (key === "cleanup") return cleanup;
      if (key === "render") return render;
      return target[key as keyof Library];
    },
  });
}
