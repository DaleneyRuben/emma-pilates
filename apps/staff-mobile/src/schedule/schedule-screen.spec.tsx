import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { assistant, assistantRoutes, from, session, until } from "../assistant/assistant-fixtures";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const coordinator = { ...assistant, id: "staff-9", name: "Carolina Rivas", role: "coordinator" };
const daySessions = `/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100&includeCancelled=true`;

function routes(profile: unknown) {
  return {
    ...assistantRoutes(),
    "/api/v1/staff-members/current": () => jsonResponse(profile),
    "/api/v1/administrator/contact-alerts": () => jsonResponse({ items: [], totalItems: 0 }),
    [daySessions]: () => jsonResponse([session]),
  };
}

async function openSchedule(role: "assistant" | "coordinator", profile: unknown) {
  const screen = await render(
    <App runtime={createStaffRuntime(routeFetcher(routes(profile)), role)} />,
  );
  await waitFor(() => expect(screen.getByTestId("tab-schedule")).toBeOnTheScreen());
  await fireEvent.press(screen.getByTestId("tab-schedule"));
  await waitFor(() => expect(screen.getByText("Emma Vargas · 50 min")).toBeOnTheScreen());
  return screen;
}

describe("Horario (v2 HOR boards)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows the Assistant a read-only day with seats and the way to book", async () => {
    const screen = await openSchedule("assistant", assistant);

    expect(screen.getByText("Asistente · Centro")).toBeOnTheScreen();
    // FIX-089 (ClaseE): the shared class row in one card, the places «N de M».
    expect(screen.getByText("1 clase hoy")).toBeOnTheScreen();
    const row = within(screen.getByTestId("schedule-session-session-1"));
    expect(row.getByText("Reformer Pilates")).toBeOnTheScreen();
    expect(row.getByTestId("class-row-time")).toHaveStyle({ backgroundColor: "#E7CCBF" });
    expect(row.getByText("6 de 12")).toHaveStyle({ color: "#93615D", fontWeight: "600" });
    expect(screen.getByTestId("class-list")).toBeOnTheScreen();
    expect(screen.queryByText("6 lugares libres")).toBeNull();
    expect(screen.queryByRole("button", { name: /Reformer Pilates/ })).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Reservar para una clienta" }));
    await waitFor(() => expect(screen.getByLabelText("Buscar clienta")).toBeOnTheScreen());
  });

  // FIX-081 (finding 118, owner 2026-11-18): the eyebrow names the person's
  // Role in his gender, not the area («Coordinación»).
  it("names a male Coordinator «Coordinador» in the eyebrow", async () => {
    const mario = { ...coordinator, name: "Mario Rivas", gender: "male" };
    const screen = await openSchedule("coordinator", mario);

    await waitFor(() => expect(screen.getByText("Coordinador · Centro")).toBeOnTheScreen());
  });

  it("gives the Coordinator «Cancelar una clase» and says the day is read-only", async () => {
    const screen = await openSchedule("coordinator", coordinator);

    expect(
      screen.getByText("Solo lectura. Para reservar, abre la ficha de una clienta."),
    ).toBeOnTheScreen();
    expect(screen.getByText("6 de 12")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Reservar para una clienta" })).toBeNull();
    expect(screen.queryByTestId("icon-row-disc")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar una clase" }));
    await waitFor(() =>
      expect(screen.getAllByText("Cancelar una clase").length).toBeGreaterThan(0),
    );
    expect(screen.getByRole("button", { name: "Volver" })).toBeOnTheScreen();
  });

  it("offers another day when today has no classes", async () => {
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({ ...routes(assistant), [daySessions]: () => jsonResponse([]) }),
          "assistant",
        )}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("tab-schedule")).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId("tab-schedule"));

    await waitFor(() => expect(screen.getByText("Este día no hay clases")).toBeOnTheScreen());
    expect(screen.getByText("Elige otro día de la semana.")).toBeOnTheScreen();
  });

  // FIX-041 (follow-up 242): each line leads the Trainer's name with her face.
  it("leads each class line with the Trainer's 20 px photo, or her initials", async () => {
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            ...routes(coordinator),
            [daySessions]: () =>
              jsonResponse([
                { ...session, trainerPhoto: { imageAssetId: "asset-emma" } },
                {
                  ...session,
                  id: "session-2",
                  trainerName: "Andrea Suárez",
                  trainerPhoto: null,
                },
              ]),
            "/api/v1/staff-photos/asset-emma?variant=thumbnail": () =>
              new Response(new Uint8Array([255, 216, 255, 224]), {
                headers: { "Content-Type": "image/jpeg" },
                status: 200,
              }),
          }),
          "coordinator",
        )}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("tab-schedule")).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId("tab-schedule"));

    const emma = await screen.findByTestId("schedule-session-session-1");
    await waitFor(() =>
      expect(within(emma).getByLabelText("Foto de Emma Vargas")).toHaveStyle({
        width: 20,
        height: 20,
      }),
    );
    expect(within(emma).getByText("Emma Vargas · 50 min")).toBeOnTheScreen();
    expect(
      within(screen.getByTestId("schedule-session-session-2")).getByText("AS"),
    ).toBeOnTheScreen();
  });

  // FIX-052 (walkthrough n.º 48): a cancelled class keeps its place, muted,
  // with its cause, as on the web and the Trainer's agenda (FIX-042).
  it.each([
    ["assistant", assistant],
    ["coordinator", coordinator],
  ] as const)("shows the %s a cancelled class in place, not bookable", async (role, profile) => {
    const prenatal = {
      ...session,
      id: "session-2",
      classTypeName: "Pilates Prenatal",
      bookedCount: 0,
      availableSeats: 12,
      cancellation: { cause: "studio", cancelledAt: from, bookedCount: 2 },
    };
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            ...routes(profile),
            [daySessions]: () => jsonResponse([{ ...session, cancellation: null }, prenatal]),
          }),
          role,
        )}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("tab-schedule")).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId("tab-schedule"));

    // FIX-083 (Horario pick A): cancelled classes wait folded at the end.
    const fold = await screen.findByRole("button", { name: /1 cancelada por el estudio/ });
    expect(screen.getByText("1 clase hoy")).toBeOnTheScreen();
    expect(screen.queryByTestId("schedule-cancelled-session-2")).toBeNull();
    await fireEvent.press(fold);
    const row = await screen.findByTestId("schedule-cancelled-session-2");
    expect(within(row).getByText("Pilates Prenatal")).toBeOnTheScreen();
    expect(within(row).getByText("Cancelada por el estudio")).toBeOnTheScreen();
    expect(screen.queryByText("12 de 12")).toBeNull();
    expect(screen.queryByTestId("schedule-session-session-2")).toBeNull();
  });

  it("folds several cancellations of one cause into one line and reads a full class as full", async () => {
    const cancelled = (id: string) => ({
      ...session,
      id,
      cancellation: { cause: "minimum_not_met", cancelledAt: from, bookedCount: 1 },
    });
    const full = { ...session, bookedCount: 12, availableSeats: 0, cancellation: null };
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            ...routes(coordinator),
            [daySessions]: () => jsonResponse([cancelled("c1"), full, cancelled("c2")]),
          }),
          "coordinator",
        )}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("tab-schedule")).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId("tab-schedule"));

    // A full class is the exception, so it alone takes the pill.
    expect(await screen.findByTestId("exception-pill")).toBeOnTheScreen();
    expect(screen.getByText("Completa")).toBeOnTheScreen();
    expect(screen.queryByText("12 de 12")).toBeNull();
    expect(screen.getByText("2 canceladas por mínimo")).toBeOnTheScreen();
    expect(screen.getByText("Ver")).toBeOnTheScreen();
  });

  it("says when every class of the day was cancelled", async () => {
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            ...routes(coordinator),
            [daySessions]: () =>
              jsonResponse([
                {
                  ...session,
                  cancellation: { cause: "minimum_not_met", cancelledAt: from, bookedCount: 1 },
                },
              ]),
          }),
          "coordinator",
        )}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("tab-schedule")).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId("tab-schedule"));

    expect(await screen.findByText("Todas las clases de hoy se cancelaron")).toBeOnTheScreen();
    expect(screen.getByText("1 cancelada por mínimo")).toBeOnTheScreen();
  });

  it("reads the length and the waitlist to a screen reader", async () => {
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            ...routes(coordinator),
            [daySessions]: () => jsonResponse([{ ...session, waitlistCount: 2 }]),
          }),
          "coordinator",
        )}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("tab-schedule")).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId("tab-schedule"));

    expect(await screen.findByTestId("schedule-session-session-1")).toHaveProp(
      "accessibilityLabel",
      expect.stringMatching(/, 50 min, 2 en espera$/),
    );
  });
});
