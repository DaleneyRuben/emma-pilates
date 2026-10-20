import appConfig from "../app.json";
import googleServices from "../google-services.json";
import easConfig from "../eas.json";
import packageJson from "../package.json";
import workspacePackageJson from "../../../package.json";

// ADR-0038/0039: manual EAS Build and Submit releases and controlled EAS
// Updates, isolated per application (ADR-0085).
describe("client release configuration", () => {
  it("keeps its own store identity and ties updates to the app version", () => {
    expect(appConfig.expo.ios.bundleIdentifier).toBe("com.emmapilates.client");
    expect(appConfig.expo.android.package).toBe("com.emmapilates.client");
    expect(appConfig.expo.runtimeVersion).toEqual({ policy: "appVersion" });
  });

  it("is linked to its own EAS project in the studio's Expo organization", () => {
    expect(appConfig.expo).toMatchObject({
      owner: "emma-pilates",
      slug: "emma-pilates-client",
      extra: {
        eas: {
          projectId: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
          ),
        },
      },
    });
  });

  it("receives updates from its own EAS project's update URL", () => {
    const { projectId } = appConfig.expo.extra.eas;

    expect(appConfig.expo).toMatchObject({ updates: { url: `https://u.expo.dev/${projectId}` } });
    expect(packageJson.dependencies).toHaveProperty("expo-updates");
  });

  it("builds a development client, an internal staging variant, and a store production binary on separate update channels", () => {
    const { build } = easConfig;

    expect(build.development).toMatchObject({
      developmentClient: true,
      distribution: "internal",
      channel: "development",
    });
    // EXT-017: the staging variant installs beside the store app.
    expect(build.staging).toMatchObject({
      distribution: "internal",
      channel: "staging",
      environment: "preview",
      env: { APP_VARIANT: "staging" },
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
    const { base, development, staging, production }: Record<string, unknown> = easConfig.build;
    const pnpmVersion = workspacePackageJson.packageManager.replace("pnpm@", "");

    expect(base).toEqual({
      node: "24.13.0",
      pnpm: pnpmVersion,
      // The backend's sharp would otherwise compile against the macOS builder's Homebrew libvips.
      env: {
        SHARP_IGNORE_GLOBAL_LIBVIPS: "1",
        // EXT-013: without the Better Stack token a build still succeeds, only
        // without source maps; Better Stack takes no dSYMs or ProGuard mappings.
        SENTRY_ALLOW_FAILURE: "true",
        SENTRY_DISABLE_XCODE_DEBUG_UPLOAD: "true",
        SENTRY_DISABLE_NATIVE_DEBUG_UPLOAD: "true",
      },
    });
    [development, staging, production].forEach((profile) => {
      expect(profile).toMatchObject({ extends: "base" });
    });
  });

  // NOT-002: remote push through expo-notifications; Android delivers it through
  // FCM, whose public client configuration is committed (it holds no secret).
  it("receives push notifications, through Firebase on Android", () => {
    expect(packageJson.dependencies).toHaveProperty("expo-notifications");
    expect(appConfig.expo.plugins).toContainEqual([
      "expo-notifications",
      { defaultChannel: "updates" },
    ]);
    expect(appConfig.expo.android).toMatchObject({ googleServicesFile: "./google-services.json" });
    expect(
      googleServices.client.map((client) => client.client_info.android_client_info.package_name),
    ).toContain("com.emmapilates.client");
  });

  // EXT-013 (ADR-0081): errors reach Better Stack through the Sentry SDK, and
  // release builds upload their JavaScript source maps through the plugin.
  it("reports errors and uploads source maps from release builds", () => {
    expect(packageJson.dependencies).toHaveProperty("@sentry/react-native");
    expect(appConfig.expo.plugins).toContain("@sentry/react-native/expo");
    // The plugin's Gradle step runs the app's own node_modules/@sentry/cli,
    // which pnpm links only for a direct dependency.
    expect(packageJson.devDependencies).toHaveProperty("@sentry/cli");
  });

  // MOB-064: the app only picks photos from the gallery, and the privacy policy
  // says it never uses the camera; false also blocks the picker library's own
  // manifest CAMERA and drops the iOS usage descriptions.
  it("asks for neither the camera nor the microphone", () => {
    expect(appConfig.expo.plugins).toContainEqual([
      "expo-image-picker",
      expect.objectContaining({ cameraPermission: false, microphonePermission: false }),
    ]);
  });

  // MOB-065: photos are picked through the system picker, which needs no read
  // access, so neither plugin adds NSPhotoLibraryUsageDescription; «Guardar
  // QR» keeps its add-only description.
  it("asks iOS only for add access to the photo library", () => {
    expect(appConfig.expo.plugins).toContainEqual([
      "expo-image-picker",
      { photosPermission: false, cameraPermission: false, microphonePermission: false },
    ]);
    expect(appConfig.expo.plugins).toContainEqual([
      "expo-media-library",
      {
        photosPermission: false,
        savePhotosPermission: "Permite que Emma Pilates guarde el QR del estudio en tus fotos.",
        granularPermissions: [],
      },
    ]);
  });

  it("submits only the production profile", () => {
    expect(Object.keys(easConfig.submit)).toEqual(["production"]);
  });
});
