import {
  getAllowedLinkHosts,
  getApiBaseUrl,
  getMobileApiBaseUrl,
  getOrCreateInstallationIdentifier,
} from "./runtime";

// ADR-0095: the link hosts of both environments, plus the API for local links.
describe("getAllowedLinkHosts", () => {
  it("accepts the production and staging link hosts and the API host", () => {
    expect(getAllowedLinkHosts("http://127.0.0.1:3100/api/v1")).toEqual([
      "links.emmapilatesstudio.com",
      "links-staging.emmapilatesstudio.com",
      "127.0.0.1",
    ]);
  });
});

describe("getApiBaseUrl", () => {
  it("accepts an absolute HTTPS API URL", () => {
    expect(getApiBaseUrl({ EXPO_PUBLIC_API_URL: "https://api.example.com/api/v1" })).toBe(
      "https://api.example.com/api/v1",
    );
  });

  it("accepts loopback HTTP for local simulator development", () => {
    expect(
      getApiBaseUrl({
        EXPO_PUBLIC_API_URL: "http://127.0.0.1:3100/api/v1",
      }),
    ).toBe("http://127.0.0.1:3100/api/v1");
  });

  it("rejects HTTP for a non-loopback API", () => {
    expect(() => getApiBaseUrl({ EXPO_PUBLIC_API_URL: "http://api.example.com/api/v1" })).toThrow(
      "HTTPS",
    );
  });

  it("rejects a missing API URL", () => {
    expect(() => getApiBaseUrl({})).toThrow("EXPO_PUBLIC_API_URL");
  });

  it("rejects a relative API URL", () => {
    expect(() => getApiBaseUrl({ EXPO_PUBLIC_API_URL: "/api/v1" })).toThrow("absolute");
  });
});

describe("getMobileApiBaseUrl", () => {
  it("uses the local backend default only during development", () => {
    expect(getMobileApiBaseUrl({}, true)).toBe("http://127.0.0.1:3100/api/v1");
    expect(() => getMobileApiBaseUrl({}, false)).toThrow("EXPO_PUBLIC_API_URL");
  });
});

describe("getOrCreateInstallationIdentifier", () => {
  it("creates one random identifier and reuses it for later Login attempts", async () => {
    const values = new Map<string, string>();
    const randomUUID = jest.fn().mockReturnValue("installation-1");
    const storage = {
      getItem: async (key: string) => values.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        values.set(key, value);
      },
    };

    await expect(getOrCreateInstallationIdentifier(storage, randomUUID)).resolves.toBe(
      "installation-1",
    );
    await expect(getOrCreateInstallationIdentifier(storage, randomUUID)).resolves.toBe(
      "installation-1",
    );
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });
});
