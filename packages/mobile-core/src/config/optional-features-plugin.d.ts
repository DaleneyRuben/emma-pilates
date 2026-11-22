import type { AndroidManifest, ConfigPlugin } from "expo/config-plugins";

/** The hardware features Google Play would otherwise imply as required. */
export const optionalFeatures: readonly string[];

/** Declares each of {@link optionalFeatures} with android:required="false". */
export function addOptionalFeatures(manifest: AndroidManifest): AndroidManifest;

declare const withOptionalAndroidFeatures: ConfigPlugin;
export default withOptionalAndroidFeatures;
