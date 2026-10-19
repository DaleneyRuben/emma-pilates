import type { ExpoConfig } from "expo/config";

import { withAppVariant } from "./app-variant";

// The app links each app's app.json claims on the production host (ADR-0095).
const linkFilter = (host: string) => [
  {
    action: "VIEW",
    autoVerify: true,
    data: [{ scheme: "https", host, pathPrefix: "/staff/authentication/" }],
    category: ["BROWSABLE", "DEFAULT"],
  },
];

// The fields each app's app.json sets that a variant changes (EXT-017).
const store: ExpoConfig = {
  name: "Emma Pilates Staff",
  slug: "emma-pilates-staff",
  scheme: "emmapilates-staff",
  icon: "./assets/icon.png",
  ios: {
    bundleIdentifier: "com.emmapilates.staff",
    supportsTablet: true,
    associatedDomains: ["applinks:links.emmapilatesstudio.com"],
  },
  android: {
    package: "com.emmapilates.staff",
    versionCode: 3,
    intentFilters: linkFilter("links.emmapilatesstudio.com"),
    adaptiveIcon: {
      backgroundColor: "#F3E9E7",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
  },
};

describe("withAppVariant", () => {
  it("leaves the store app untouched without a variant", () => {
    expect(withAppVariant(store, undefined)).toEqual(store);
    expect(withAppVariant(store, "")).toEqual(store);
  });

  it("gives the staging app its own IDs, scheme, name, link host, and marked icons", () => {
    expect(withAppVariant(store, "staging")).toEqual({
      ...store,
      name: "Staging Emma Pilates Staff",
      scheme: "emmapilates-staff-staging",
      icon: "./assets/staging/icon.png",
      ios: {
        bundleIdentifier: "com.emmapilates.staff.staging",
        supportsTablet: true,
        associatedDomains: ["applinks:links-staging.emmapilatesstudio.com"],
      },
      android: {
        ...store.android,
        package: "com.emmapilates.staff.staging",
        intentFilters: linkFilter("links-staging.emmapilatesstudio.com"),
        adaptiveIcon: {
          ...store.android?.adaptiveIcon,
          foregroundImage: "./assets/staging/android-icon-foreground.png",
        },
      },
    });
  });

  it("refuses an unknown variant", () => {
    expect(() => withAppVariant(store, "preview")).toThrow(
      'APP_VARIANT must be empty or "staging", not "preview"',
    );
  });
});
