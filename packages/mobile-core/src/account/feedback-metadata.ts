import { requireOptionalNativeModule } from "expo";
import { runtimeVersion } from "expo-updates";
import { Platform } from "react-native";

/** What «Enviar comentarios» attaches on its own (REL-012); the Role comes from the session. */
export type FeedbackMetadata = {
  appVersion: string;
  appBuild: string;
  platform: "android" | "ios";
  osVersion: string;
};

type NativeApplication = {
  nativeApplicationVersion: string | null;
  nativeBuildVersion: string | null;
};

type MetadataSources = {
  platform: { OS: string; Version: string | number; constants: { Release?: string } };
  application: NativeApplication | null;
  runtimeVersion: string | null;
};

const unknown = "desconocida";

const present = (value: string | null | undefined): string | null =>
  value === null || value === undefined || value.trim() === "" ? null : value.trim();

export function readFeedbackMetadata({
  platform,
  application,
  runtimeVersion: updateRuntime,
}: MetadataSources): FeedbackMetadata {
  const android = platform.OS === "android";
  return {
    // The runtime version follows the app version (app.json's appVersion
    // policy), so an update still names the store build it runs on.
    appVersion: present(application?.nativeApplicationVersion) ?? present(updateRuntime) ?? unknown,
    appBuild: present(application?.nativeBuildVersion) ?? unknown,
    platform: android ? "android" : "ios",
    osVersion: (android ? present(platform.constants.Release) : null) ?? String(platform.Version),
  };
}

/**
 * The installed build's details. ExpoApplication ships in every build through
 * expo-notifications; it is read as optional so a build without it still
 * sends feedback, and nothing native is added (EAS Update reaches it).
 */
export function deviceFeedbackMetadata(): FeedbackMetadata {
  return readFeedbackMetadata({
    platform: {
      OS: Platform.OS,
      Version: Platform.Version,
      constants: Platform.constants as { Release?: string },
    },
    application: requireOptionalNativeModule<NativeApplication>("ExpoApplication"),
    runtimeVersion,
  });
}

const systemNames = { android: "Android", ios: "iOS" } as const;

export function describeFeedbackDevice(metadata: FeedbackMetadata): string {
  return `la versión de la app (${metadata.appVersion}, compilación ${metadata.appBuild}), el sistema (${systemNames[metadata.platform]} ${metadata.osVersion})`;
}
