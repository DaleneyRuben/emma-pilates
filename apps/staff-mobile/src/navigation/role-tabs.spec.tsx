import { tabOptions } from "./role-tabs";

// Walkthrough n.º 28: a tab always opens on its root screen, so leaving a tab
// pops its stack (React Navigation's `popToTopOnBlur`).
describe("the Staff tabs", () => {
  it("pop each tab's stack when another tab is chosen", () => {
    const options = tabOptions(
      "Clientes",
      "clients",
      "ClientSearch",
    )({
      route: { key: "clients", name: "ClientSearch" },
    });

    expect(options.popToTopOnBlur).toBe(true);
  });
});
