import { deactivateCurrentDevice, registerCurrentDevice } from "@pilates/api-contracts";

import type { PushPlatform } from "./push-platform";

export type PushRegistrationResult = "registered" | "deactivated" | "undetermined" | "failed";

// ADR-0025, ADR-0067: a granted installation registers its token for the
// signed-in Account; a denied one stops receiving that Account's pushes. Push
// stays optional, so every failure is reported, never thrown.
export async function syncPushRegistration({
  fetcher,
  installationId,
  platform,
}: {
  fetcher: typeof globalThis.fetch;
  installationId: () => Promise<string>;
  platform: PushPlatform;
}): Promise<PushRegistrationResult> {
  try {
    const status = await platform.getPermissionStatus();

    if (status === "undetermined") {
      return "undetermined";
    }

    if (status === "denied") {
      await deactivateCurrentDevice({ installationId: await installationId() }, undefined, fetcher);
      return "deactivated";
    }

    await platform.prepareChannels();
    const response = await registerCurrentDevice(
      {
        installationId: await installationId(),
        expoPushToken: await platform.getPushToken(),
        platform: platform.os,
      },
      undefined,
      fetcher,
    );

    return response.status === 204 ? "registered" : "failed";
  } catch {
    return "failed";
  }
}
