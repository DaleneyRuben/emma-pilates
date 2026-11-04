import { pendingRows, todaySummary } from "./home-pending";

const none = {
  payments: 0,
  freezes: 0,
  contactAlerts: 0,
  feedback: 0,
  lowStock: 0,
  statements: 0,
};

// P01: «Por resolver», each row with the tab that settles it.
describe("the Inicio pending list", () => {
  it("names each waiting thing in the board's order with its tab", () => {
    expect(
      pendingRows(
        {
          payments: 1,
          freezes: 1,
          contactAlerts: 3,
          feedback: 2,
          lowStock: 1,
          statements: 3,
        },
        { branchName: "Centro", monthLabel: "noviembre de 2026" },
      ).map((row) => [row.title, row.note, row.to]),
    ).toEqual([
      ["1 pago por revisar", "Transferencias y QR", "/dinero/pagos"],
      [
        "1 congelamiento por decidir",
        "Pedido desde la app",
        "/clientas/congelamientos",
      ],
      [
        "3 clientas para contactar",
        "Primeros 90 días sin reservar",
        "/clientas/para-contactar",
      ],
      ["2 comentarios nuevos", "Desde las apps", "/comentarios"],
      ["1 insumo con stock bajo", "Sucursal Centro", "/estudio/insumos"],
      ["3 sueldos por aprobar", "noviembre de 2026", "/dinero/sueldos"],
    ]);
  });

  it("leaves out what has nothing waiting", () => {
    expect(
      pendingRows(
        { ...none, payments: 2 },
        { branchName: undefined, monthLabel: "" },
      ).map((row) => row.title),
    ).toEqual(["2 pagos por revisar"]);
    expect(
      pendingRows(none, { branchName: undefined, monthLabel: "" }),
    ).toEqual([]);
  });
});

// P01: «Hoy en Centro»: classes, bookings and occupancy of today.
describe("the Inicio day summary", () => {
  const session = (startsAt: string, booked: number, capacity: number) => ({
    startsAt,
    bookedCount: booked,
    capacity,
  });

  it("counts only today's Sessions, in Bolivia time", () => {
    expect(
      todaySummary(
        [
          session("2026-11-03T13:00:00.000Z", 12, 12),
          session("2026-11-03T22:30:00.000Z", 9, 12),
          // 4 November 01:00 in Bolivia.
          session("2026-11-04T05:00:00.000Z", 5, 12),
        ],
        "2026-11-03",
      ),
    ).toMatchObject({ classes: 2, bookings: 21, occupancyPercent: 88 });
  });

  it("has no occupancy without classes", () => {
    expect(todaySummary([], "2026-11-03")).toMatchObject({
      classes: 0,
      bookings: 0,
      occupancyPercent: null,
    });
  });
});
