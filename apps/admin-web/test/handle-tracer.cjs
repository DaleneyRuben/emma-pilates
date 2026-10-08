// Temporary diagnostic: records every async resource that can hold the Node
// process and prints the ones still referenced after each spec file.
const asyncHooks = require("node:async_hooks");
const realProcess = require("node:process");
const tracked = new Set([
  "Timeout", "Immediate", "MessagePort", "TCPWRAP", "TCPSERVERWRAP",
  "PIPEWRAP", "PIPESERVERWRAP", "TTYWRAP", "FSREQCALLBACK", "SIGNALWRAP",
  "PROCESSWRAP", "ZLIB", "HTTPINCOMINGMESSAGE", "HTTPCLIENTREQUEST",
  "Worker", "FSEVENTWRAP", "STATWATCHER", "UDPWRAP",
]);
if (!realProcess.__handleTracer) {
  const live = new Map();
  realProcess.__handleTracer = { live };
  asyncHooks
    .createHook({
      init(id, type, triggerId, resource) {
        if (!tracked.has(type)) return;
        const stack = new Error().stack.split("\n").slice(1, 14).join("\n");
        live.set(id, { type, resource, stack, triggerId });
      },
      destroy(id) {
        live.delete(id);
      },
    })
    .enable();
}
function report(label) {
  const { live } = realProcess.__handleTracer;
  const lines = [`[tracer] ${label} at ${new Date().toISOString()}: ${live.size} tracked resources`];
  for (const [id, entry] of live) {
    const r = entry.resource;
    const hasRef = typeof r?.hasRef === "function" ? r.hasRef() : "?";
    if (hasRef === false) continue;
    const ms = r?._idleTimeout;
    lines.push(
      `  #${id} ${entry.type} hasRef=${hasRef}${ms !== undefined ? ` ms=${ms}` : ""} trigger=${entry.triggerId}\n${entry.stack}`,
    );
  }
  realProcess.stderr.write(lines.join("\n") + "\n");
}
afterAll(() => report(`after ${expect.getState().testPath}`));
// Keeps reporting while something else holds the process after the summary;
// the interval itself never holds it.
if (!realProcess.__handleTracer.ticker) {
  realProcess.__handleTracer.ticker = setInterval(
    () => report("still alive"),
    60_000,
  );
  realProcess.__handleTracer.ticker.unref();
}
