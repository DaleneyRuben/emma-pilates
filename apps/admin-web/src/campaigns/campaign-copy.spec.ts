import { skippedLine, skippedPreview } from "./campaign-copy";

describe("campaign result copy", () => {
  it("agrees the verb with several skipped Clients", () => {
    expect(
      skippedLine([
        { name: "Mariana Peña", reason: "no_current_plan" },
        { name: "Sofía Guzmán", reason: "no_current_plan" },
      ]),
    ).toBe("2 clientas no tienen un plan vigente: Mariana Peña, Sofía Guzmán.");
  });

  // FIX-060 (walkthrough finding 87): founders are left out for being
  // founders, not for lacking a Plan.
  it("names founders apart from Clients without a Plan", () => {
    const skipped = [
      { name: "Carla Rivas", reason: "founder" as const },
      { name: "Elena Prueba", reason: "founder" as const },
      { name: "Sofía Guzmán", reason: "no_current_plan" as const },
    ];
    expect(skippedPreview(skipped)).toBe(
      "2 son fundadoras y no entran en campañas: Carla Rivas, Elena Prueba. Sofía Guzmán no tiene un plan vigente.",
    );
    expect(skippedLine(skipped)).toBe(
      "2 fundadoras no entran en campañas: Carla Rivas, Elena Prueba. 1 clienta no tiene un plan vigente: Sofía Guzmán.",
    );
    expect(skippedPreview([{ name: "Lucía", reason: "founder" }])).toBe(
      "Lucía es fundadora y no entra en campañas.",
    );
  });
});
