export type AndroidApp = {
  packageName: string;
  sha256CertFingerprints: readonly string[];
};

export const androidApps: readonly AndroidApp[] = [];

export const androidAssetLinks = (apps: readonly AndroidApp[]): unknown[] =>
  apps.map(() => ({}));

export const appleAppSiteAssociation = (teamId: string | null): unknown => ({
  teamId,
});
