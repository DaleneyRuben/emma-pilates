import { uploadReceipt } from "./receipt-upload";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" }, status });

// Walkthrough n.º 7 (C10u): the receipt uploads as soon as it is picked and
// the row shows how far it got, step by step.
describe("uploadReceipt progress", () => {
  it("reports each step of the upload until the receipt is attached", async () => {
    const progress: number[] = [];
    const fetcher = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      const method = init?.method ?? "GET";
      if (method === "POST" && path.endsWith("/uploads")) {
        return json({ id: "asset-1", uploadUrl: "/u", expiresAt: "2026-09-21T15:15:00.000Z" }, 201);
      }
      if (method === "PUT") return new Response(null, { status: 204 });
      if (path.endsWith("/finalize")) return json({ id: "asset-1", state: "processing" }, 202);
      if (path.endsWith("/receipt")) return json({ id: "intent-1" });
      return json({ id: "asset-1", state: "ready", mediaType: "image/jpeg" });
    });

    await uploadReceipt(
      { bytes: new Uint8Array([1, 2, 3]), mediaType: "image/jpeg", uri: "file:///r.jpg" },
      "intent-1",
      fetcher as unknown as typeof fetch,
      async () => undefined,
      (fraction) => progress.push(fraction),
    );

    expect(progress).toEqual([0.1, 0.7, 0.8, 0.95, 1]);
  });
});
