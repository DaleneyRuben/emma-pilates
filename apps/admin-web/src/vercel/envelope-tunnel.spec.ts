import { forwardEnvelope } from "../../api/monitoring/envelope";

const dsn = "https://publickey@s1.eu.betterstackdata.com/2796561";
const ingest =
  "https://s1.eu.betterstackdata.com/api/2796561/envelope/?sentry_key=publickey&sentry_version=7";

const envelope = (header: string) =>
  `${header}\n{"type":"event"}\n{"exception":{"values":[{"type":"TypeError"}]}}`;
const matching = envelope(JSON.stringify({ event_id: "e1", dsn }));

const post = (body: BodyInit, headers: HeadersInit = {}) =>
  new Request("https://admin.example/api/monitoring/envelope", {
    method: "POST",
    body,
    headers,
  });

const fakeSend = (status = 200) =>
  jest.fn<Promise<Response>, Parameters<typeof fetch>>(async () =>
    Promise.resolve(new Response("{}", { status })),
  );

describe("admin web error tunnel (EXT-012)", () => {
  it("forwards a matching envelope to the configured DSN's ingest URL", async () => {
    const send = fakeSend(200);

    const response = await forwardEnvelope(post(matching), dsn, send);

    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      ingest,
      expect.objectContaining({ method: "POST", body: matching }),
    );
  });

  it("sends only the content type: no cookies, forwarded addresses, or other headers", async () => {
    const send = fakeSend(200);

    await forwardEnvelope(
      post(matching, {
        cookie: "session=secret",
        "x-forwarded-for": "203.0.113.7",
        "user-agent": "Brave",
      }),
      dsn,
      send,
    );

    const headers = new Headers(send.mock.lastCall?.[1]?.headers);
    expect([...headers.keys()]).toEqual(["content-type"]);
    expect(headers.get("content-type")).toBe("application/x-sentry-envelope");
  });

  it("passes the ingest status back", async () => {
    const response = await forwardEnvelope(post(matching), dsn, fakeSend(429));

    expect(response.status).toBe(429);
  });

  it("answers 502 when the ingest cannot be reached", async () => {
    const send = jest.fn(async () => Promise.reject(new TypeError("offline")));

    const response = await forwardEnvelope(post(matching), dsn, send);

    expect(response.status).toBe(502);
  });

  it("is off without a configured DSN, so previews forward nothing", async () => {
    const send = fakeSend();

    expect(
      (await forwardEnvelope(post(matching), undefined, send)).status,
    ).toBe(404);
    expect((await forwardEnvelope(post(matching), "", send)).status).toBe(404);
    expect(send).not.toHaveBeenCalled();
  });

  it("accepts only POST", async () => {
    const send = fakeSend();
    const get = new Request("https://admin.example/api/monitoring/envelope");

    expect((await forwardEnvelope(get, dsn, send)).status).toBe(405);
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses an envelope over 64 KB", async () => {
    const send = fakeSend();
    const large = `${matching}\n${"x".repeat(64 * 1024)}`;

    expect((await forwardEnvelope(post(large), dsn, send)).status).toBe(413);
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    ["no header line", ""],
    ["a header that is not JSON", envelope("not json")],
    ["a header without a DSN", envelope('{"event_id":"e1"}')],
    ["a DSN that is not a URL", envelope('{"dsn":"nowhere"}')],
  ])("answers 400 for %s", async (_case, body) => {
    const send = fakeSend();

    expect((await forwardEnvelope(post(body), dsn, send)).status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  // The destination comes only from the configured DSN, never the request, so
  // the tunnel is not an open relay.
  it.each([
    ["another host", "https://publickey@evil.example/2796561"],
    ["another project", "https://publickey@s1.eu.betterstackdata.com/1"],
    ["another key", "https://otherkey@s1.eu.betterstackdata.com/2796561"],
    ["another scheme", "http://publickey@s1.eu.betterstackdata.com/2796561"],
  ])("answers 403 for an envelope addressed to %s", async (_case, other) => {
    const send = fakeSend();
    const body = envelope(JSON.stringify({ dsn: other }));

    expect((await forwardEnvelope(post(body), dsn, send)).status).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });
});
