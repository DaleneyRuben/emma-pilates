import appConfig from "../app.json";
import easConfig from "../eas.json";
import packageJson from "../package.json";
import workspacePackageJson from "../../../package.json";

// ADR-0038/0039: manual EAS Build and Submit releases and controlled EAS
// Updates, isolated per application (ADR-0085).
describe("staff release configuration", () => {
  it("keeps its own store identity and ties updates to the app version", () => {
    expect(appConfig.expo.ios.bundleIdentifier).toBe("com.emmapilates.staff");
    expect(appConfig.expo.android.package).toBe("com.emmapilates.staff");
    expect(appConfig.expo.runtimeVersion).toEqual({ policy: "appVersion" });
  });

  it("is linked to its own EAS project in the studio's Expo organization", () => {
    expect(appConfig.expo).toMatchObject({
      owner: "emma-pilates",
      slug: "emma-pilates-staff",
      extra: {
        eas: {
          projectId: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
          ),
        },
      },
    });
  });

  it("builds a development client, an internal preview, and a store production binary on separate update channels", () => {
    const { build } = easConfig;

    expect(build.development).toMatchObject({
      developmentClient: true,
      distribution: "internal",
      channel: "development",
    });
    expect(build.preview).toMatchObject({
      distribution: "internal",
      channel: "preview",
    });
    expect(build.production).toMatchObject({
      distribution: "store",
      channel: "production",
      autoIncrement: true,
    });
    expect(JSON.stringify(build.production)).not.toContain("localhost");
    expect(easConfig.cli.appVersionSource).toBe("local");
  });

  it("installs development builds on the iOS Simulator with the development client", () => {
    expect(easConfig.build.development).toMatchObject({ ios: { simulator: true } });
    expect(packageJson.dependencies).toHaveProperty("expo-dev-client");
  });

  it("builds every profile with the workspace's Node and pnpm versions", () => {
    const { base, development, preview, production }: Record<string, unknown> = easConfig.build;
    const pnpmVersion = workspacePackageJson.packageManager.replace("pnpm@", "");

    expect(base).toEqual({ node: "24.13.0", pnpm: pnpmVersion });
    [development, preview, production].forEach((profile) => {
      expect(profile).toMatchObject({ extends: "base" });
    });
  });

  it("submits only the production profile", () => {
    expect(Object.keys(easConfig.submit)).toEqual(["production"]);
  });
});
