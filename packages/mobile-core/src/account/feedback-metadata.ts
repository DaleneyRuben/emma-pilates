export type FeedbackMetadata = {
  appVersion: string;
  appBuild: string;
  platform: "android" | "ios";
  osVersion: string;
};

type MetadataSources = {
  platform: { OS: string; Version: string | number; constants: { Release?: string } };
  application: {
    nativeApplicationVersion: string | null;
    nativeBuildVersion: string | null;
  } | null;
  runtimeVersion: string | null;
};

export function readFeedbackMetadata(sources: MetadataSources): FeedbackMetadata {
  void sources;
  throw new Error("not implemented");
}

export function describeFeedbackDevice(metadata: FeedbackMetadata): string {
  void metadata;
  throw new Error("not implemented");
}
