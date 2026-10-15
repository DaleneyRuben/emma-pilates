import type { ConfigPlugin } from "expo/config-plugins";

/** Adds the push-tap forwarding override to a generated Kotlin MainActivity. */
export function addLaunchTapForwarding(source: string): string;

declare const withLaunchTapForwarding: ConfigPlugin;
export default withLaunchTapForwarding;
