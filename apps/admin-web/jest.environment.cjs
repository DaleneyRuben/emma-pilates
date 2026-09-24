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
    // jsdom's crypto has no `subtle`; the upload module hashes the bytes
    // it declares with SHA-256 (ADR-0072), which Node's Web Crypto has.
    Object.defineProperty(this.global, "crypto", {
      value: globalThis.crypto,
      configurable: true,
      writable: true,
    });
    for (const name of nodeGlobals) {
      if (this.global[name] === undefined && globalThis[name] !== undefined) {
        this.global[name] = globalThis[name];
      }
    }
  }
}

module.exports = AdminWebTestEnvironment;
