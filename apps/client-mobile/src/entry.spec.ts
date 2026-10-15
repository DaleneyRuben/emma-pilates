import { startErrorReporting } from "@pilates/mobile-core";
import { registerRootComponent } from "expo";

jest.mock("@pilates/mobile-core", () => ({
  ...jest.requireActual("@pilates/mobile-core"),
  startErrorReporting: jest.fn(),
}));
jest.mock("expo", () => ({ ...jest.requireActual("expo"), registerRootComponent: jest.fn() }));

// EXT-013: reporting starts at the application shell (ADR-0081), before the
// root component registers, so the first render's errors are reported too.
describe("client-mobile entry point", () => {
  it("starts error reporting as client-mobile before registering the root component", () => {
    jest.isolateModules(() => {
      require("../index");
    });

    expect(startErrorReporting).toHaveBeenCalledWith("client-mobile");
    expect(jest.mocked(startErrorReporting).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(registerRootComponent).mock.invocationCallOrder[0],
    );
  });
});
