type RuntimeEnvironment = {
  EXPO_PUBLIC_API_URL?: string;
};

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

  if (url.protocol !== "https:") {
    throw new Error("EXPO_PUBLIC_API_URL must use HTTPS");
  }

  return url.toString().replace(/\/$/, "");
}
