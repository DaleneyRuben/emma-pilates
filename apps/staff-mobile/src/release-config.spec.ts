import appConfig from "../app.json";
import easConfig from "../eas.json";

// ADR-0038/0039: manual EAS Build and Submit releases and controlled EAS
// Updates, isolated per application (ADR-0085).
describe("staff release configuration", () => {
  it("keeps its own store identity and ties updates to the app version", () => {
    expect(appConfig.expo.ios.bundleIdentifier).toBe("com.emmapilates.staff");
    expect(appConfig.expo.android.package).toBe("com.emmapilates.staff");
    expect(appConfig.expo.runtimeVersion).toEqual({ policy: "appVersion" });
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

  it("submits only the production profile", () => {
    expect(Object.keys(easConfig.submit)).toEqual(["production"]);
  });
});
