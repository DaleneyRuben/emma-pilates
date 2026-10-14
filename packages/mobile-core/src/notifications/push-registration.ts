import type { PushPlatform } from "./push-platform";

export type PushRegistrationResult = "registered" | "deactivated" | "undetermined" | "failed";

export async function syncPushRegistration(dependencies: {
  fetcher: typeof globalThis.fetch;
  installationId: () => Promise<string>;
  platform: PushPlatform;
}): Promise<PushRegistrationResult> {
  return dependencies.platform.os === "ios" ? "failed" : "failed";
}
