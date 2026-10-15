import type { PushPermissionStatus } from "./push-platform";

// Android 13+ reports «denied» before the app has ever asked, with the system
// still able to ask; only then is the person's answer unknown (ADR-0067).
export function toPushPermissionStatus(response: {
  granted: boolean;
  canAskAgain: boolean;
}): PushPermissionStatus {
  if (response.granted) return "granted";
  return response.canAskAgain ? "undetermined" : "denied";
}
