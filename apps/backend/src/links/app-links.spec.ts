import {
  androidApps,
  androidAssetLinks,
  appleAppSiteAssociation,
} from './app-links';

// ADR-0095: the verification files the link hosts serve for both apps.
describe('app links', () => {
  it('lets each Android package handle the links its certificates sign', () => {
    expect(
      androidAssetLinks([
        {
          packageName: 'com.emmapilates.client',
          sha256CertFingerprints: ['AA:BB'],
        },
      ]),
    ).toEqual([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.emmapilates.client',
          sha256_cert_fingerprints: ['AA:BB'],
        },
      },
    ]);
  });

  it('leaves out a package whose signing certificate is not known yet', () => {
    expect(
      androidAssetLinks([
        {
          packageName: 'com.emmapilates.staff.staging',
          sha256CertFingerprints: [],
        },
      ]),
    ).toEqual([]);
  });

  it('lists the store and staging packages of both apps', () => {
    expect(androidApps.map((app) => app.packageName)).toEqual([
      'com.emmapilates.client',
      'com.emmapilates.staff',
      'com.emmapilates.client.staging',
      'com.emmapilates.staff.staging',
    ]);
    expect(
      androidApps.find((app) => app.packageName === 'com.emmapilates.client')
        ?.sha256CertFingerprints,
    ).toEqual([
      'F6:84:F6:15:46:56:DE:E1:DE:18:5E:4E:6F:77:3D:EA:91:95:D4:35:51:CE:09:6F:C0:1B:5C:C8:A3:1E:B2:86',
      'AC:CB:86:F3:D7:A0:4E:EF:AB:99:96:B3:F8:8A:5B:C2:18:4F:6A:CC:0D:7E:A5:45:0E:0A:6A:73:4C:59:D1:1A',
    ]);
    expect(
      androidApps.find((app) => app.packageName === 'com.emmapilates.staff')
        ?.sha256CertFingerprints,
    ).toEqual([
      'EE:E2:71:4C:60:D7:B8:1D:8F:49:40:9D:B0:6E:CB:1F:1C:16:5A:3C:9F:E6:E8:AA:73:4F:F1:A9:34:DC:09:C5',
      '76:B6:5F:06:31:4F:63:0E:EE:4C:F5:1D:40:3D:9E:3A:7B:67:8B:52:6C:61:BF:96:5B:2B:21:93:FE:56:48:FD',
    ]);
    expect(
      androidApps.find(
        (app) => app.packageName === 'com.emmapilates.staff.staging',
      )?.sha256CertFingerprints,
    ).toEqual([
      'EF:1B:60:B3:3F:35:BF:C3:FD:C6:86:AD:FD:5F:0E:2F:9C:C0:72:0C:5B:8C:A0:B7:E0:48:83:1A:22:95:42:3C',
    ]);
  });

  it('claims no iOS app until the Apple Team ID exists', () => {
    expect(appleAppSiteAssociation(null)).toEqual({
      applinks: { details: [] },
    });
  });

  it('gives each iOS app only its own path prefix', () => {
    expect(appleAppSiteAssociation('TEAM123456')).toEqual({
      applinks: {
        details: [
          {
            appIDs: [
              'TEAM123456.com.emmapilates.client',
              'TEAM123456.com.emmapilates.client.staging',
            ],
            components: [{ '/': '/client/authentication/*' }],
          },
          {
            appIDs: [
              'TEAM123456.com.emmapilates.staff',
              'TEAM123456.com.emmapilates.staff.staging',
            ],
            components: [{ '/': '/staff/authentication/*' }],
          },
        ],
      },
    });
  });
});
