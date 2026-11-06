import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { assistant, assistantRoutes, from, session, until } from "../assistant/assistant-fixtures";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const coordinator = { ...assistant, id: "staff-9", name: "Carolina Rivas", role: "coordinator" };
const daySessions = `/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`;

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
  await waitFor(() => expect(screen.getByText("Reformer Pilates")).toBeOnTheScreen());
  return screen;
}

describe("Horario (v2 HOR boards)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows the Assistant a read-only day with seats and the way to book", async () => {
    const screen = await openSchedule("assistant", assistant);

    expect(screen.getByText("Asistente · Sucursal Centro")).toBeOnTheScreen();
    expect(screen.getByText("Emma Vargas · 6 de 12 reservados")).toBeOnTheScreen();
    expect(screen.getByText("6 cupos")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Reformer Pilates/ })).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Reservar para una clienta" }));
    await waitFor(() => expect(screen.getByLabelText("Buscar cliente")).toBeOnTheScreen());
  });

  it("gives the Coordinator «Cancelar una clase» and says the day is read-only", async () => {
    const screen = await openSchedule("coordinator", coordinator);

    expect(
      screen.getByText("Solo lectura. Para reservar, abre la ficha de una clienta."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("6 cupos")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Reservar para una clienta" })).toBeNull();

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
    expect(within(emma).getByText("Emma Vargas · 6 de 12 reservados")).toBeOnTheScreen();
    expect(
      within(screen.getByTestId("schedule-session-session-2")).getByText("AS"),
    ).toBeOnTheScreen();
  });
});
