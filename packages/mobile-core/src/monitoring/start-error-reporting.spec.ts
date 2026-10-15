import { init } from "@sentry/react-native";

import { startErrorReporting } from "./start-error-reporting";

jest.mock("@sentry/react-native", () => ({
  ...jest.requireActual("@sentry/react-native"),
  init: jest.fn(),
}));

describe("startErrorReporting (EXT-013)", () => {
  const original = process.env.EXPO_PUBLIC_ERROR_REPORTING_DSN;

  afterEach(() => {
    process.env.EXPO_PUBLIC_ERROR_REPORTING_DSN = original;
    jest.mocked(init).mockClear();
  });

  it("reports to the DSN the build was given, as development under Metro", () => {
    process.env.EXPO_PUBLIC_ERROR_REPORTING_DSN = "https://token@errors.example.com/3";

    expect(startErrorReporting("staff-mobile")).toBe(true);

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://token@errors.example.com/3",
        environment: "development",
        initialScope: { tags: { service: "staff-mobile" } },
      }),
    );
  });

  it("starts nothing when the build has no DSN", () => {
    delete process.env.EXPO_PUBLIC_ERROR_REPORTING_DSN;

    expect(startErrorReporting("client-mobile")).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });
});
