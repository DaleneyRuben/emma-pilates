import { getApiBaseUrl } from "./runtime";

describe("getApiBaseUrl", () => {
  it("accepts an absolute HTTPS API URL", () => {
    expect(
      getApiBaseUrl({ EXPO_PUBLIC_API_URL: "https://api.example.com/api/v1" }),
    ).toBe("https://api.example.com/api/v1");
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
