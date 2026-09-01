type RuntimeEnvironment = {
  EXPO_PUBLIC_API_URL?: string;
};

const localDevelopmentApiUrl = "http://127.0.0.1:3100/api/v1";

export function getApiBaseUrl(environment: RuntimeEnvironment): string {
  const value = environment.EXPO_PUBLIC_API_URL;

  if (value === undefined || value.trim() === "") {
    throw new Error("EXPO_PUBLIC_API_URL must be configured");
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("EXPO_PUBLIC_API_URL must be an absolute URL");
  }

  const isLoopbackHttp =
    url.protocol === "http:" &&
    ["127.0.0.1", "[::1]", "localhost"].includes(url.hostname);

  if (url.protocol !== "https:" && !isLoopbackHttp) {
    throw new Error("EXPO_PUBLIC_API_URL must use HTTPS");
  }

  return url.toString().replace(/\/$/, "");
}

export function getMobileApiBaseUrl(
  environment: RuntimeEnvironment,
  development: boolean,
): string {
  return getApiBaseUrl({
    EXPO_PUBLIC_API_URL:
      environment.EXPO_PUBLIC_API_URL ??
      (development ? localDevelopmentApiUrl : undefined),
  });
}
