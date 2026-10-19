// EXT-017 (ADR-0092): APP_VARIANT=staging builds an app that installs beside
// the store app: its own bundle ID, package, and scheme, and a name and icon
// marked as staging. Each app's app.config.js calls this at build time, so it
// stays plain JavaScript like the other config-time modules.
const stagingAssets = "./assets/staging";
// ADR-0095: the staging app claims the staging link host instead.
const productionLinkHost = "links.emmapilatesstudio.com";
const stagingLinkHost = "links-staging.emmapilatesstudio.com";

function withStagingLinkHost(intentFilters) {
  return intentFilters?.map((filter) => ({
    ...filter,
    data: filter.data?.map((entry) =>
      entry.host === productionLinkHost ? { ...entry, host: stagingLinkHost } : entry,
    ),
  }));
}

function withAppVariant(config, variant) {
  if (variant === undefined || variant === "") {
    return config;
  }
  if (variant !== "staging") {
    throw new Error(`APP_VARIANT must be empty or "staging", not "${variant}"`);
  }
  return {
    ...config,
    name: `Staging ${config.name}`,
    scheme: `${config.scheme}-staging`,
    icon: `${stagingAssets}/icon.png`,
    ios: {
      ...config.ios,
      bundleIdentifier: `${config.ios.bundleIdentifier}.staging`,
      ...(config.ios.associatedDomains === undefined
        ? {}
        : {
            associatedDomains: config.ios.associatedDomains.map((domain) =>
              domain === `applinks:${productionLinkHost}` ? `applinks:${stagingLinkHost}` : domain,
            ),
          }),
    },
    android: {
      ...config.android,
      package: `${config.android.package}.staging`,
      ...(config.android.intentFilters === undefined
        ? {}
        : { intentFilters: withStagingLinkHost(config.android.intentFilters) }),
      adaptiveIcon: {
        ...config.android.adaptiveIcon,
        foregroundImage: `${stagingAssets}/android-icon-foreground.png`,
      },
    },
  };
}

module.exports = { withAppVariant };
