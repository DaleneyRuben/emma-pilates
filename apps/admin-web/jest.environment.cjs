const { TestEnvironment } = require("jest-environment-jsdom");

// jsdom lacks the WHATWG fetch and stream globals that MSW's Node
// interceptors and the generated fetch client need; Node 24 has them all.
const nodeGlobals = [
  "fetch",
  "Request",
  "Response",
  "Headers",
  "FormData",
  "Blob",
  "File",
  "TextEncoder",
  "TextDecoder",
  "ReadableStream",
  "WritableStream",
  "TransformStream",
  "BroadcastChannel",
  "MessageChannel",
  "MessagePort",
  "structuredClone",
];

// Node's fetch rejects jsdom's AbortSignal, and TanStack Query passes one to
// every query, so the abort pair must come from Node as well.
const replacedGlobals = ["AbortController", "AbortSignal"];

class AdminWebTestEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context);
    for (const name of replacedGlobals) {
      this.global[name] = globalThis[name];
    }
    for (const name of nodeGlobals) {
      if (this.global[name] === undefined && globalThis[name] !== undefined) {
        this.global[name] = globalThis[name];
      }
    }
  }
}

module.exports = AdminWebTestEnvironment;
