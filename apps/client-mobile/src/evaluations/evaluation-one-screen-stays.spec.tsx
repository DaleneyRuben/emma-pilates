import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import * as ImagePicker from "expo-image-picker";

import { jsonResponse, routeFetcher } from "../test-support";
import { chooseReceipt, paid, qrRoute, uploadRoutes } from "./evaluation-receipt-test-support";
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

// Review of FIX-057: the one Evaluación nutricional stays mounted while she
// books, moves and uploads, so what used to die with a closed screen must not
// leak into the next command.
const paidFields = {
  ...paid,
  paymentId: "payment-1",
  cancellable: false,
  reschedulable: true,
  paymentState: "confirmed",
} as const;
const at = (slotId: string, civilDate: string, time: string) =>
  upcomingEvaluation("evaluation-paid", boliviaInstant(civilDate, time), {
    ...paidFields,
    slotId,
  });
const slotTimes: Record<string, [string, string]> = {
  "slot-1": [firstDay, "09:00"],
  "slot-2": [firstDay, "09:45"],
  "slot-3": [secondDay, "15:00"],
};

describe("One Evaluación nutricional across commands", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockReset();
  });

  it("moves back to an earlier slot under a new key instead of replaying", async () => {
    let current = "slot-2";
    const keys: string[] = [];
    const fetcher = routeFetcher({
      ...baseRoutes(),
      "/api/v1/evaluations?scope=upcoming": () =>
        jsonResponse(page([at(current, ...slotTimes[current]!)])),
      "POST /api/v1/evaluations/evaluation-paid/reschedule": (init) => {
        const { slotId } = JSON.parse(String(init?.body)) as { slotId: string };
        keys.push(new Headers(init?.headers).get("idempotency-key") ?? "");
        current = slotId;
        return jsonResponse(at(slotId, ...slotTimes[slotId]!));
      },
    });
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");
    const moveTo = async (civilDate: string, time: string) => {
      await fireEvent.press(await screen.findByRole("button", { name: "Reprogramar" }));
      await fireEvent.press(await screen.findByRole("button", { name: dayName(civilDate) }));
      await fireEvent.press(screen.getByRole("button", { name: `Turno ${time}` }));
      await fireEvent.press(await screen.findByRole("button", { name: "Sí, mover evaluación" }));
      await waitFor(() => expect(screen.queryByText("Elige el nuevo horario")).toBeNull());
    };

    await moveTo(secondDay, "15:00");
    await moveTo(firstDay, "09:00");
    await moveTo(secondDay, "15:00");

    expect(keys).toHaveLength(3);
    expect(keys[2]).not.toEqual(keys[0]);
  });

  it("keeps the receipt sheet open when she closes the photo picker", async () => {
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValue({ canceled: true, assets: null } as never);
    const fetcher = routeFetcher({
      ...baseRoutes(qrRoute),
      "/api/v1/evaluations?scope=upcoming": () =>
        jsonResponse(
          page([
            upcomingEvaluation("evaluation-paid", boliviaInstant(firstDay, "09:45"), {
              ...paidFields,
              paymentState: null,
              receiptUploadable: true,
            }),
          ]),
        ),
    });
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");

    await fireEvent.press(
      await screen.findByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );
    await fireEvent.press(
      within(screen.getByTestId("evaluation-receipt-sheet")).getByTestId(
        "evaluation-receipt-sheet-row",
      ),
    );

    await waitFor(() => {
      expect(jest.mocked(ImagePicker.launchImageLibraryAsync)).toHaveBeenCalled();
    });
    expect(screen.getByTestId("evaluation-receipt-sheet")).toBeOnTheScreen();
  });

  it("keeps her booked Evaluation when the turnos fail to load", async () => {
    const fetcher = routeFetcher({
      ...baseRoutes(),
      "/api/v1/evaluation-slots": () => jsonResponse({ code: "internal" }, 500),
      "/api/v1/evaluations?scope=upcoming": () =>
        jsonResponse(page([at("slot-2", firstDay, "09:45")])),
    });
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");

    expect(await screen.findByTestId("next-evaluation")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reprogramar" })).toBeOnTheScreen();
    expect(screen.getByText("No pudimos cargar los horarios de evaluación.")).toBeOnTheScreen();
  });

  it("refreshes the turnos when she pulls down", async () => {
    let slotReads = 0;
    const routes = baseRoutes();
    const fetcher = routeFetcher({
      ...routes,
      "/api/v1/evaluation-slots": () => {
        slotReads += 1;
        return routes["/api/v1/evaluation-slots"]();
      },
    });
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");
    expect(await screen.findByText("Reserva tu evaluación")).toBeOnTheScreen();
    const before = slotReads;

    const [refreshControl] = screen.getByTestId("evaluation-scroll").children;
    await fireEvent(refreshControl as Parameters<typeof fireEvent>[0], "refresh");

    await waitFor(() => expect(slotReads).toBeGreaterThan(before));
  });
  // Android walk: the booking's toast stayed over the turnos she then had to
  // tap to move the Evaluation.
  it("puts the booking's toast away when she starts to move it", async () => {
    chooseReceipt();
    let booked = false;
    const paidSlots = {
      ...availability,
      days: availability.days.map((d) => ({
        ...d,
        slots: d.slots.map((entry) => ({ ...entry, ...paid })),
      })),
    };
    const fetcher = routeFetcher({
      ...baseRoutes({ ...qrRoute, ...uploadRoutes() }),
      "/api/v1/evaluation-slots": () => jsonResponse(paidSlots),
      "POST /api/v1/evaluation-slots/slot-2/evaluation-payments": () => {
        booked = true;
        return jsonResponse(at("slot-2", firstDay, "09:45"), 201);
      },
      "POST /api/v1/evaluations/evaluation-paid/receipt": () => new Response(null, { status: 204 }),
      "/api/v1/evaluations?scope=upcoming": () =>
        jsonResponse(page(booked ? [at("slot-2", firstDay, "09:45")] : [])),
    });
    const screen = await openProfileRow(fetcher, "Evaluación nutricional");
    await fireEvent.press(await screen.findByRole("button", { name: "Turno 09:45" }));
    await fireEvent.press(
      await screen.findByRole("button", { name: "Sube tu comprobante de transferencia" }),
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirmar evaluación" })).toBeEnabled();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar evaluación" }));
    expect(await screen.findByText("Comprobante enviado")).toBeOnTheScreen();

    await fireEvent.press(await screen.findByRole("button", { name: "Reprogramar" }));

    expect(await screen.findByText("Elige el nuevo horario")).toBeOnTheScreen();
    expect(screen.queryByText("Comprobante enviado")).toBeNull();
  });
});
