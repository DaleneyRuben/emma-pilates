import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

const session = {
  bookedCount: 6,
  branchName: "Equipetrol",
  capacity: 8,
  classTypeName: "Reformer Intermedio",
  endsAt: "2026-09-10T13:00:00.000Z",
  sessionId: "session-1",
  startsAt: "2026-09-10T12:00:00.000Z",
};

const piece = (kind: string, number: number, status = "working") => ({
  id: `${kind}-${number}`,
  branchId: "branch-1",
  kind,
  number,
  status,
  openIssueCount: status === "working" ? 0 : 1,
  archivedAt: null,
});

const routes = (equipment: ReturnType<typeof piece>[]) => ({
  "/api/v1/trainer/sessions": () => jsonResponse([session]),
  "/api/v1/trainer/sessions/session-1/roster": () => jsonResponse({ ...session, bookings: [] }),
  "/api/v1/trainer/sessions/session-1/equipment": () =>
    jsonResponse({ sessionId: "session-1", kind: "reformer", items: equipment }),
  "POST /api/v1/trainer/sessions/session-1/equipment-issues": () =>
    jsonResponse({ id: "issue-1" }, 201),
  "/api/v1/staff-members/current": () =>
    jsonResponse({
      id: "staff-1",
      name: "Emma Vargas",
      email: "emma.vargas@example.com",
      phone: null,
      role: "trainer",
      branches: [],
    }),
  "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
});

const openReport = async (fetcher: ReturnType<typeof routeFetcher>) => {
  const screen = await render(<App runtime={createStaffRuntime(fetcher)} />);
  await waitFor(() => expect(screen.getByText("Reformer Intermedio")).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole("button", { name: /^Reformer Intermedio,/ }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Reportar una falla" })).toBeOnTheScreen(),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Reportar una falla" }));
  return screen;
};

// S26 (BKO-004): a Trainer reports a fault from a Session of her agenda.
describe("Trainer fault report", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("sends the chosen piece, what happened, and whether it can be used", async () => {
    const fetcher = routeFetcher(
      routes([piece("reformer", 3), piece("reformer", 5, "out_of_service"), piece("mat", 1)]),
    );
    const screen = await openReport(fetcher);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Reformer 3" })).toBeOnTheScreen(),
    );
    expect(screen.getByRole("button", { name: "Reformer 5, fuera de servicio" })).toBeOnTheScreen();
    expect(screen.getByText("Mats")).toBeOnTheScreen();
    const send = screen.getByRole("button", { name: "Enviar reporte" });
    expect(send).toBeDisabled();

    await fireEvent.press(screen.getByRole("button", { name: "Reformer 3" }));
    await fireEvent.changeText(screen.getByLabelText("¿Qué pasó?"), "El resorte rojo se soltó.");
    await fireEvent.press(screen.getByRole("checkbox", { name: "No se puede usar" }));
    await fireEvent.press(screen.getByRole("button", { name: "Enviar reporte" }));

    await waitFor(() => expect(screen.getByText("Gracias por avisar")).toBeOnTheScreen());
    expect(
      screen.getByText("Administración ya puede ver la falla de Reformer 3."),
    ).toBeOnTheScreen();
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/trainer/sessions/session-1/equipment-issues",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          equipmentId: "reformer-3",
          description: "El resorte rojo se soltó.",
          outOfService: true,
        }),
      }),
    );

    await fireEvent.press(screen.getByRole("button", { name: "Volver a la lista" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Reportar una falla" })).toBeOnTheScreen(),
    );
  });

  it("says when the Branch has no Equipment registered", async () => {
    const screen = await openReport(routeFetcher(routes([])));
    await waitFor(() => expect(screen.getByText("Sin equipos registrados")).toBeOnTheScreen());
  });
});
