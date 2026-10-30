import { cleanup, fireEvent } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse, routeFetcher } from "../test-support";
import {
  availability,
  baseRoutes,
  boliviaInstant,
  dayName,
  firstDay,
  openProfileRow,
  page,
  secondDay,
  upcomingEvaluation,
} from "./evaluation-test-support";

jest.setTimeout(30_000);

// Review of FIX-016: what happens around a move, not the move itself.
const paidFields = {
  included: false,
  priceCentavos: 7_000,
  paymentId: "payment-1",
  cancellable: false,
  reschedulable: true,
} as const;

const paid = upcomingEvaluation("evaluation-paid", boliviaInstant(firstDay, "09:45"), {
  ...paidFields,
  slotId: "slot-2",
});
const moved = upcomingEvaluation("evaluation-paid", boliviaInstant(secondDay, "15:00"), {
  ...paidFields,
  slotId: "slot-3",
});

type Sent = { slotId: string; key: string | null };

const openPicker = async (fetcher: typeof globalThis.fetch) => {
  const screen = await openProfileRow(fetcher, "Mis evaluaciones");
  await fireEvent.press(await screen.findByRole("button", { name: "Reprogramar" }));
  expect(await screen.findByText("Elige otro turno")).toBeOnTheScreen();
  return screen;
};

const pick = async (screen: Awaited<ReturnType<typeof openPicker>>, day: string, time: string) => {
  await fireEvent.press(screen.getByRole("button", { name: dayName(day) }));
  await fireEvent.press(screen.getByRole("button", { name: `Turno ${time}` }));
  await fireEvent.press(await screen.findByRole("button", { name: "Sí, mover evaluación" }));
};

describe("Around a paid Evaluation move", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("closes the sheet on a refused move and sends the next slot under its own key", async () => {
    const sent: Sent[] = [];
    const fetcher = routeFetcher({
      ...baseRoutes(),
      "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page([paid])),
      "POST /api/v1/evaluations/evaluation-paid/reschedule": (init) => {
        const body = JSON.parse(String(init?.body)) as { slotId: string };
        sent.push({ slotId: body.slotId, key: new Headers(init?.headers).get("idempotency-key") });
        return body.slotId === "slot-1"
          ? jsonResponse({ code: "evaluation_slot_unavailable" }, 409)
          : jsonResponse(moved);
      },
    });
    const screen = await openPicker(fetcher);
    await pick(screen, firstDay, "09:00");

    expect(
      await screen.findByText("Ese horario ya no está disponible. Elige otro."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("¿Mover tu evaluación?")).toBeNull();

    await pick(screen, secondDay, "15:00");
    expect(await screen.findByText("Evaluación reprogramada")).toBeOnTheScreen();
    expect(sent.map((call) => call.slotId)).toEqual(["slot-1", "slot-3"]);
    expect(sent[0]?.key).not.toEqual(sent[1]?.key);
  });

  it("does not leave the picker behind once the move succeeds", async () => {
    const fetcher = routeFetcher({
      ...baseRoutes(),
      "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page([paid])),
      "POST /api/v1/evaluations/evaluation-paid/reschedule": () => jsonResponse(moved),
    });
    const screen = await openPicker(fetcher);
    await pick(screen, secondDay, "15:00");
    expect(await screen.findByText("Evaluación reprogramada")).toBeOnTheScreen();
    // popTo removed the picker from the stack: nothing is left to go Back to.
    expect(screen.queryByText("Elige otro turno")).toBeNull();
  });

  it("retries the same slot under the same key after a lost response", async () => {
    const sent: Sent[] = [];
    const fetcher = routeFetcher({
      ...baseRoutes(),
      "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page([paid])),
      "POST /api/v1/evaluations/evaluation-paid/reschedule": (init) => {
        const body = JSON.parse(String(init?.body)) as { slotId: string };
        sent.push({ slotId: body.slotId, key: new Headers(init?.headers).get("idempotency-key") });
        if (sent.length === 1) throw new Error("network lost");
        return jsonResponse(moved);
      },
    });
    const screen = await openPicker(fetcher);
    await pick(screen, secondDay, "15:00");
    expect(
      await screen.findByText("No pudimos reprogramar la evaluación. Inténtalo de nuevo."),
    ).toBeOnTheScreen();

    await pick(screen, secondDay, "15:00");
    expect(await screen.findByText("Evaluación reprogramada")).toBeOnTheScreen();
    expect(sent).toHaveLength(2);
    expect(sent[0]?.key).toEqual(sent[1]?.key);
  });

  it("keeps the refusal on screen when no other turno is left", async () => {
    let refused = false;
    const fetcher = routeFetcher({
      ...baseRoutes(),
      "/api/v1/evaluation-slots": () =>
        jsonResponse(
          refused
            ? { days: [], months: availability.months }
            : {
                ...availability,
                days: availability.days.filter((d) => d.date === secondDay),
              },
        ),
      "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page([paid])),
      "POST /api/v1/evaluations/evaluation-paid/reschedule": () => {
        refused = true;
        return jsonResponse({ code: "evaluation_slot_unavailable" }, 409);
      },
    });
    const screen = await openPicker(fetcher);
    await fireEvent.press(screen.getByRole("button", { name: "Turno 15:00" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Sí, mover evaluación" }));

    expect(await screen.findByText("No hay horarios disponibles por ahora.")).toBeOnTheScreen();
    expect(screen.getByText("Ese horario ya no está disponible. Elige otro.")).toBeOnTheScreen();
  });

  it("lets a Client whose plan ended move her paid Evaluation", async () => {
    const fetcher = routeFetcher({
      ...baseRoutes(),
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({ status: "none", subscription: null }),
      "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page([paid])),
    });
    const screen = await openPicker(fetcher);

    expect(
      await screen.findByText(
        "Tu evaluación ya está pagada. Elige el nuevo horario: el pago se mantiene.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Necesitas un plan activo para reservar tu evaluación.")).toBeNull();
    expect(screen.getByRole("button", { name: "Turno 09:00" })).toBeOnTheScreen();
  });

  it("says no other turno is open instead of the used-month state", async () => {
    const onlyHers = {
      days: [
        {
          date: firstDay,
          slots: availability.days.flatMap((d) => d.slots).filter((s) => s.id === "slot-2"),
        },
      ],
      months: [{ month: `${firstDay.slice(0, 7)}-01`, status: "used", evaluation: null }],
    };
    const fetcher = routeFetcher({
      ...baseRoutes(),
      "/api/v1/evaluation-slots": () => jsonResponse(onlyHers),
      "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page([paid])),
    });
    const screen = await openPicker(fetcher);

    expect(await screen.findByText("No hay horarios disponibles por ahora.")).toBeOnTheScreen();
    expect(screen.queryByText(/Ya usaste tu evaluación/)).toBeNull();
    expect(screen.queryByText(/evaluación gratuita/)).toBeNull();
  });
});
