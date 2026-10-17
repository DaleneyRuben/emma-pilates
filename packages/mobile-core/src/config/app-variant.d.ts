import type { ExpoConfig } from "expo/config";

/** The store app's config, or the staging variant's (EXT-017, ADR-0092). */
export function withAppVariant(config: ExpoConfig, variant: string | undefined): ExpoConfig;
