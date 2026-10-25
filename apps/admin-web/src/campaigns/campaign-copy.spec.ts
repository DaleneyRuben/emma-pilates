import { skippedLine } from "./campaign-copy";

describe("campaign result copy", () => {
  it("agrees the verb with several skipped Clients", () => {
    expect(
      skippedLine([{ name: "Mariana Peña" }, { name: "Sofía Guzmán" }]),
    ).toBe("2 clientas no tienen un plan vigente: Mariana Peña, Sofía Guzmán.");
  });
});
