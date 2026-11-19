import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse, routeFetcher } from "../test-support";
import {
  availability,
  baseRoutes,
  boliviaInstant,
  civilDateIn,
  firstDay,
  openProfileRow,
  page,
  secondDay,
  slot,
  upcomingEvaluation,
} from "./evaluation-test-support";

jest.setTimeout(30_000);

// C5 pick C «Todo en la cita y horarios a un toque»: her appointment in the
// Palo de rosa block with its actions inside, then the next three slots.
const included = (days: number) =>
  upcomingEvaluation("evaluation-1", boliviaInstant(civilDateIn(days), "09:45"));
const paid = upcomingEvaluation("evaluation-paid", boliviaInstant(civilDateIn(6), "09:45"), {
  included: false,
  priceCentavos: 7_000,
  paymentId: "payment-1",
  paymentState: "confirmed",
  receiptAttached: true,
  cancellable: false,
  reschedulable: true,
});
const paidAvailability = {
  ...availability,
  days: [
    {
      date: firstDay,
      slots: [
        slot("slot-1", firstDay, "09:00", { included: false, priceCentavos: 10_000 }),
        slot("slot-2", firstDay, "09:45", { included: false, priceCentavos: 10_000 }),
      ],
    },
    {
      date: secondDay,
      slots: [slot("slot-3", secondDay, "15:00", { included: false, priceCentavos: 10_000 })],
    },
  ],
  includedEvaluation: "used",
  priceCentavos: 10_000,
};

const open = (upcoming: unknown[], extra: Parameters<typeof routeFetcher>[0] = {}) =>
  openProfileRow(
    routeFetcher({
      ...baseRoutes(),
      "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page(upcoming)),
      ...extra,
    }),
    "Evaluación nutricional",
  );

describe("Evaluation appointment block", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("puts the whole appointment in the Palo de rosa block", async () => {
    const screen = await open([included(4)]);

    const block = await screen.findByTestId("next-evaluation");
    expect(block).toHaveStyle({ backgroundColor: "#B78380" });
    expect(within(block).getByText("Tu cita · en 4 días")).toBeOnTheScreen();
    expect(within(block).getByText(/^[A-ZÁÉ][a-zé]{2} \d+ [a-z]{3} · 09:45$/)).toBeOnTheScreen();
    expect(within(block).getByText("GR")).toBeOnTheScreen();
    expect(within(block).getByText("Gabriela Rojas · Centro · 45 min")).toBeOnTheScreen();
    expect(
      within(block).getByText("Gratis · primera del trimestre · llega 10 min antes"),
    ).toBeOnTheScreen();
    expect(within(block).getByRole("button", { name: "Cancelar evaluación" })).toBeOnTheScreen();
    expect(within(block).getByText("Cancelar")).toBeOnTheScreen();
    // An included one is cancelled, not moved: no Cambiar fecha.
    expect(screen.queryByRole("button", { name: "Cambiar fecha" })).toBeNull();
  });

  it("says hoy and mañana when they apply", async () => {
    const screen = await open([included(1)]);

    expect(await screen.findByText("Tu cita · mañana")).toBeOnTheScreen();
  });

  it("offers the next three slots in Crema boxes, each opening Confirma tu cita", async () => {
    const screen = await open([included(4)]);

    expect(await screen.findByText("¿Otra evaluación?")).toBeOnTheScreen();
    expect(screen.getByText("Próximos horarios con Gabriela · Gratis")).toBeOnTheScreen();
    const first = screen.getByRole("button", { name: /^Turno .+ 09:00$/ });
    expect(first).toHaveStyle({ backgroundColor: "#F9F4F2", borderColor: "#CDA697" });
    expect(screen.getByRole("button", { name: /^Turno .+ 09:45$/ })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Turno .+ 15:00$/ })).toBeOnTheScreen();
    // The full calendar waits behind Ver más días.
    expect(screen.queryByText("Días disponibles")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: /^Turno .+ 09:45$/ }));
    await waitFor(() => {
      expect(screen.getByText("Confirma tu cita")).toBeOnTheScreen();
    });
  });

  it("opens the full calendar with Ver más días", async () => {
    const screen = await open([included(4)]);

    await fireEvent.press(await screen.findByRole("button", { name: "Ver más días" }));

    expect(screen.getByText("Días disponibles")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Turno 09:00" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Ver más días" })).toBeNull();
  });

  it("gives a paid one its price and state and moves it with Cambiar fecha", async () => {
    const screen = await open([paid], {
      "/api/v1/evaluation-slots": () => jsonResponse(paidAvailability),
    });

    const block = await screen.findByTestId("next-evaluation");
    expect(within(block).getByText("Bs 70 · Pagada · llega 10 min antes")).toBeOnTheScreen();
    expect(screen.getByText("Próximos horarios con Gabriela · Bs 100")).toBeOnTheScreen();

    await fireEvent.press(within(block).getByRole("button", { name: "Cambiar fecha" }));

    expect(await screen.findByText("Elige el nuevo horario")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Turno 15:00" })).toBeOnTheScreen();
  });
});
