import { payPlacement } from "./pay-placement";

// E8 (ADR-0111): where «Mis pagos» lives for each Role.
describe("payPlacement", () => {
  it("gives a tab to the Trainer, the Coordinator and the Nutritionist", () => {
    expect(payPlacement("trainer")).toBe("tab");
    expect(payPlacement("coordinator")).toBe("tab");
    expect(payPlacement("nutritionist")).toBe("tab");
  });

  it("puts it in Perfil for the Assistant and nowhere for the Administrator", () => {
    expect(payPlacement("assistant")).toBe("profile");
    expect(payPlacement("administrator")).toBe("none");
    expect(payPlacement(undefined)).toBe("none");
  });

  it("gives someone with several Roles the tab when any of them has one", () => {
    expect(payPlacement(["assistant", "coordinator"])).toBe("tab");
    expect(payPlacement(["administrator", "assistant"])).toBe("profile");
  });
});
