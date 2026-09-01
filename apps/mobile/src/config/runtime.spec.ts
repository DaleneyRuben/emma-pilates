import { getApiBaseUrl, getMobileApiBaseUrl } from "./runtime";

describe("getApiBaseUrl", () => {
  it("accepts an absolute HTTPS API URL", () => {
    expect(
      getApiBaseUrl({ EXPO_PUBLIC_API_URL: "https://api.example.com/api/v1" }),
    ).toBe("https://api.example.com/api/v1");
  });

  it("accepts loopback HTTP for local simulator development", () => {
    expect(
      getApiBaseUrl({
        EXPO_PUBLIC_API_URL: "http://127.0.0.1:3100/api/v1",
      }),
    ).toBe("http://127.0.0.1:3100/api/v1");
  });

  it("rejects HTTP for a non-loopback API", () => {
    expect(() =>
      getApiBaseUrl({ EXPO_PUBLIC_API_URL: "http://api.example.com/api/v1" }),
    ).toThrow("HTTPS");
  });

  it("rejects a missing API URL", () => {
    expect(() => getApiBaseUrl({})).toThrow("EXPO_PUBLIC_API_URL");
  });

  it("rejects a relative API URL", () => {
    expect(() => getApiBaseUrl({ EXPO_PUBLIC_API_URL: "/api/v1" })).toThrow(
      "absolute",
    );
  });
});

describe("getMobileApiBaseUrl", () => {
  it("uses the local backend default only during development", () => {
    expect(getMobileApiBaseUrl({}, true)).toBe(
      "http://127.0.0.1:3100/api/v1",
    );
    expect(() => getMobileApiBaseUrl({}, false)).toThrow(
      "EXPO_PUBLIC_API_URL",
    );
  });
});
