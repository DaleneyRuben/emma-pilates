// Temporary MOB-057 diagnostic, removed before the item is marked done:
// records every Timeout the suite creates with its delay, stack, and spec
// file, and prints the ones still active after each spec file.
const asyncHooks = require("node:async_hooks");

const state = (asyncHooks.__pilatesDiag ||= {
  handles: new Map(),
  currentFile: "(none)",
  hooked: false,
});

if (!state.hooked) {
  state.hooked = true;
  asyncHooks
    .createHook({
      init(asyncId, type, triggerAsyncId, resource) {
        if (type !== "Timeout" && type !== "Immediate" && type !== "TCPWRAP" && type !== "FSREQCALLBACK") {
          return;
        }
        const previous = Error.stackTraceLimit;
        Error.stackTraceLimit = 40;
        const stack = new Error().stack || "";
        Error.stackTraceLimit = previous;
        state.handles.set(asyncId, {
          type,
          delay: resource && resource._idleTimeout,
          file: state.currentFile,
          resource: new WeakRef(resource),
          stack: stack
            .split("\n")
            .slice(2)
            .filter((line) => !/node:internal|async_hooks|jest-circus|jest-runtime|jest-runner/.test(line))
            .slice(0, 12)
            .map((line) => line.trim())
            .join(" <- "),
        });
      },
      destroy(asyncId) {
        state.handles.delete(asyncId);
      },
    })
    .enable();
}

beforeAll(() => {
  state.currentFile = expect.getState().testPath;
});

afterAll(() => {
  const active = [];
  for (const [id, handle] of state.handles) {
    const resource = handle.resource.deref();
    const refed = resource && typeof resource.hasRef === "function" ? resource.hasRef() : "?";
    if (refed === false) continue;
    active.push(`#${id} ${handle.type} delay=${handle.delay} ref=${refed} from=${handle.file}\n      ${handle.stack}`);
  }
  process.stderr.write(
    `\n[handle-diagnostic] after ${state.currentFile}: ${active.length} active\n  ${active.join("\n  ")}\n`,
  );
});
