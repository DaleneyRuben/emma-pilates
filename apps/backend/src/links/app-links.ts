// ADR-0095: the files that let Android and iOS hand the link hosts' paths to
// the apps. Certificate fingerprints and Team IDs are public, so they live
// here rather than in the environment.
export type AndroidApp = {
  packageName: string;
  sha256CertFingerprints: readonly string[];
};

// Each package lists the EAS upload key that signs its builds and, for store
// packages, the Google Play app-signing key that re-signs what Play delivers.
export const androidApps: readonly AndroidApp[] = [
  {
    packageName: 'com.emmapilates.client',
    sha256CertFingerprints: [
      'F6:84:F6:15:46:56:DE:E1:DE:18:5E:4E:6F:77:3D:EA:91:95:D4:35:51:CE:09:6F:C0:1B:5C:C8:A3:1E:B2:86',
      'AC:CB:86:F3:D7:A0:4E:EF:AB:99:96:B3:F8:8A:5B:C2:18:4F:6A:CC:0D:7E:A5:45:0E:0A:6A:73:4C:59:D1:1A',
    ],
  },
  {
    packageName: 'com.emmapilates.staff',
    sha256CertFingerprints: [
      'EE:E2:71:4C:60:D7:B8:1D:8F:49:40:9D:B0:6E:CB:1F:1C:16:5A:3C:9F:E6:E8:AA:73:4F:F1:A9:34:DC:09:C5',
      '76:B6:5F:06:31:4F:63:0E:EE:4C:F5:1D:40:3D:9E:3A:7B:67:8B:52:6C:61:BF:96:5B:2B:21:93:FE:56:48:FD',
    ],
  },
  {
    packageName: 'com.emmapilates.client.staging',
    sha256CertFingerprints: [
      '36:9E:35:FB:3C:75:44:9D:7C:32:42:44:22:31:06:E6:52:D6:1D:C1:5E:47:B9:E7:E4:30:8C:2F:FB:8C:F5:7C',
    ],
  },
  {
    packageName: 'com.emmapilates.staff.staging',
    sha256CertFingerprints: [
      'EF:1B:60:B3:3F:35:BF:C3:FD:C6:86:AD:FD:5F:0E:2F:9C:C0:72:0C:5B:8C:A0:B7:E0:48:83:1A:22:95:42:3C',
    ],
  },
];

export const androidAssetLinks = (apps: readonly AndroidApp[]) =>
  apps
    .filter((app) => app.sha256CertFingerprints.length > 0)
    .map((app) => ({
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: app.packageName,
        sha256_cert_fingerprints: app.sha256CertFingerprints,
      },
    }));

// Gate 9: the Apple Developer account, and with it the Team ID, is pending.
export const appleTeamId: string | null = null;

const iosApps = [
  { bundleIdentifier: 'com.emmapilates.client', prefix: '/client' },
  { bundleIdentifier: 'com.emmapilates.staff', prefix: '/staff' },
] as const;

export const appleAppSiteAssociation = (teamId: string | null) => ({
  applinks: {
    details:
      teamId === null
        ? []
        : iosApps.map((app) => ({
            appIDs: [
              `${teamId}.${app.bundleIdentifier}`,
              `${teamId}.${app.bundleIdentifier}.staging`,
            ],
            components: [{ '/': `${app.prefix}/authentication/*` }],
          })),
  },
});
