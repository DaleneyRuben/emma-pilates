import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse, routeFetcher } from "../test-support";
import {
  baseRoutes,
  boliviaInstant,
  dayName,
  firstDay,
  openProfileRow,
  page,
  secondDay,
  upcomingEvaluation,
} from "./evaluation-test-support";
import { evaluationDate } from "./evaluation-format";

jest.setTimeout(30_000);

// Follow-up 218 §3–4: the picker in reschedule mode and the sheet that
// confirms the move before the request is sent.
const paidFields = {
  included: false,
  priceCentavos: 7_000,
  paymentId: "payment-1",
  cancellable: false,
  reschedulable: true,
} as const;

const turno = (instant: Date | string) => {
  const date = evaluationDate(String(instant instanceof Date ? instant.toISOString() : instant));
  return date.charAt(0).toLowerCase() + date.slice(1);
};

const setUp = () => {
  const before = boliviaInstant(firstDay, "09:45");
  const after = boliviaInstant(secondDay, "15:00");
  const paid = upcomingEvaluation("evaluation-paid", before, { ...paidFields, slotId: "slot-2" });
  const moved = upcomingEvaluation("evaluation-paid", after, { ...paidFields, slotId: "slot-3" });
  let posted = false;
  const fetcher = routeFetcher({
    ...baseRoutes(),
    "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page(posted ? [moved] : [paid])),
    "POST /api/v1/evaluations/evaluation-paid/reschedule": (init) => {
      posted = true;
      expect(JSON.parse(String(init?.body))).toEqual({ slotId: "slot-3" });
      expect(new Headers(init?.headers).get("idempotency-key")).toEqual(
        expect.stringMatching(/^[0-9a-f-]{36}$/),
      );
      return jsonResponse(moved);
    },
  });
  return { after, before, fetcher };
};

const rescheduleCalled = (fetcher: typeof globalThis.fetch) =>
  jest
    .mocked(fetcher)
    .mock.calls.some(([url]) => String(url).endsWith("/evaluation-paid/reschedule"));

const openPicker = async (fetcher: typeof globalThis.fetch) => {
  const screen = await openProfileRow(fetcher, "Mis evaluaciones");
  await fireEvent.press(await screen.findByRole("button", { name: "Reprogramar" }));
  expect(await screen.findByText("Elige otro turno")).toBeOnTheScreen();
  return screen;
};

describe("Rescheduling a paid Evaluation", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("speaks of a paid move, not a free booking, and hides the current turno", async () => {
    const { fetcher } = setUp();
    const screen = await openPicker(fetcher);

    expect(
      screen.getByText(
        "Tu evaluación ya está pagada. Elige el nuevo horario: el pago se mantiene.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/evaluación gratuita/)).toBeNull();
    expect(
      screen.getByText("Al elegir un horario te pediremos confirmar el cambio."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Puedes reprogramarla hasta 3 horas antes.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Turno 09:45" })).toBeNull();
  });

  it("asks before moving and «Volver» moves nothing", async () => {
    const { after, before, fetcher } = setUp();
    const screen = await openPicker(fetcher);
    await fireEvent.press(screen.getByRole("button", { name: dayName(secondDay) }));
    await fireEvent.press(screen.getByRole("button", { name: "Turno 15:00" }));

    expect(await screen.findByText("¿Mover tu evaluación?")).toBeOnTheScreen();
    expect(screen.getByText(`Antes: ${turno(before)}, 09:45`)).toBeOnTheScreen();
    expect(screen.getByText(`Ahora: ${turno(after)}, 15:00`)).toBeOnTheScreen();
    expect(screen.getByText("El pago se mantiene: no pagas de nuevo.")).toBeOnTheScreen();
    expect(
      screen.getByText("El horario anterior queda libre para otras clientas."),
    ).toBeOnTheScreen();
    expect(rescheduleCalled(fetcher)).toBe(false);

    await fireEvent.press(
      within(screen.getByTestId("reschedule-evaluation-sheet")).getByRole("button", {
        name: "Volver",
      }),
    );
    await waitFor(() => {
      expect(screen.queryByText("¿Mover tu evaluación?")).toBeNull();
    });
    expect(rescheduleCalled(fetcher)).toBe(false);
    expect(screen.getByText("Elige otro turno")).toBeOnTheScreen();
  });

  it("moves the paid Evaluation once confirmed, books nothing new and says so", async () => {
    const { fetcher } = setUp();
    const screen = await openPicker(fetcher);
    await fireEvent.press(screen.getByRole("button", { name: dayName(secondDay) }));
    await fireEvent.press(screen.getByRole("button", { name: "Turno 15:00" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Sí, mover evaluación" }));

    await waitFor(() => {
      expect(rescheduleCalled(fetcher)).toBe(true);
    });
    expect(fetcher).not.toHaveBeenCalledWith(
      expect.stringMatching(/\/evaluation-slots\/.*\/evaluations/),
      expect.anything(),
    );
    expect(await screen.findByText("Evaluación reprogramada")).toBeOnTheScreen();
    expect(screen.queryByText("Confirmar evaluación")).toBeNull();
  });
});
