import type { PayStatementLineDto } from "@pilates/api-contracts";
import { conceptsOf } from "./pay-statement-concepts";

const line = (
  kind: PayStatementLineDto["kind"],
  amountCentavos: number,
  detail = "",
): PayStatementLineDto => ({ kind, detail, amountCentavos });

// Finding 105: lines are grouped by concept, in the staff app's order (S29),
// each with its count, rate and subtotal.
describe("pay statement concepts", () => {
  it("groups a Trainer's lines with count × rate and subtotal", () => {
    const concepts = conceptsOf([
      line("minimum_not_met", 2_500, "lun 2 nov · 07:00"),
      line("class", 6_500, "lun 2 nov · 10:45"),
      line("minimum_not_met", 2_500, "lun 2 nov · 08:15"),
      line("commission", 4_800, "Lucía Mendoza"),
      line("commission", 7_190, "Andrea Salinas"),
    ]);

    expect(
      concepts.map(({ key, label, rate, subtotalCentavos, lines }) => ({
        key,
        label,
        rate,
        subtotalCentavos,
        count: lines.length,
      })),
    ).toEqual([
      {
        key: "class",
        label: "Clases dictadas",
        rate: "1 × Bs 65,00",
        subtotalCentavos: 6_500,
        count: 1,
      },
      {
        key: "minimum_not_met",
        label: "Canceladas por mínimo",
        rate: "2 × Bs 25,00",
        subtotalCentavos: 5_000,
        count: 2,
      },
      {
        key: "commission",
        label: "Comisiones de primer plan",
        rate: "2 comisiones",
        subtotalCentavos: 11_990,
        count: 2,
      },
    ]);
  });

  it("states mixed amounts by how many of each", () => {
    const [newClients] = conceptsOf([
      line("new_client", 5_000),
      line("new_client", 8_000),
      line("new_client", 5_000),
    ]);

    expect(newClients.rate).toBe("2 × Bs 50,00 · 1 × Bs 80,00");
  });

  it("keeps a kind a newer API adds, under «Otros», so the total adds up", () => {
    const concepts = conceptsOf([
      line("base", 350_000),
      { kind: "travel", detail: "Viáticos", amountCentavos: 1_000 } as never,
    ]);

    expect(concepts.map((concept) => concept.label)).toEqual(["Base", "Otros"]);
  });
});
