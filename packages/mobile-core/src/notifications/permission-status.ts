import type { PushPermissionStatus } from "./push-platform";

export function toPushPermissionStatus(response: {
  granted: boolean;
  canAskAgain: boolean;
}): PushPermissionStatus {
  return response.granted ? "granted" : "denied";
}
