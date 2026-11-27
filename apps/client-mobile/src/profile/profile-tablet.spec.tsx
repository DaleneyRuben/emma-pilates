import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";
import { openProfileOnTablet, readRoutes } from "./profile-test-support";

jest.setTimeout(20_000);

const notice = {
  id: "n1",
  category: "booking_schedule",
  type: "session_cancelled",
  title: "Aviso",
  message: "Tu clase de Reformer Pilates fue cancelada.",
  destinationType: null,
  destinationId: null,
  createdAt: "2026-09-22T14:20:00.000Z",
  readAt: null,
};

const openOnTablet = () =>
  openProfileOnTablet(
    createClientRuntime(
      routeFetcher({
        ...readRoutes,
        "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 1 }),
        "/api/v1/notifications?limit=50": () =>
          jsonResponse({ items: [notice], hasMore: false, nextCursor: null }),
      }),
    ),
  );

// Follow-up 289: Perfil and the screens it opens on a tablet (18T, 19T,
// 22T, 23T, 25T).
describe("Perfil on a tablet", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    jest.restoreAllMocks();
  });

  it("puts the identity, «Cerrar sesión» and the version in a 300 pt column (18T)", async () => {
    const screen = await openOnTablet();

    const left = screen.getByTestId("tablet-columns-left");
    const right = screen.getByTestId("tablet-columns-right");
    expect(left).toHaveStyle({ width: 300 });
    expect(right).toHaveStyle({ flex: 1 });
    expect(within(left).getByText("Sofía Guzmán")).toBeOnTheScreen();
    expect(within(left).getByTestId("profile-identity")).toHaveStyle({ flexDirection: "column" });
    expect(within(left).getByRole("button", { name: "Cerrar sesión" })).toBeOnTheScreen();
    // The column's 16 pt gap is already the footer's 16 pt.
    expect(within(left).getByTestId("profile-footer")).toHaveStyle({ marginTop: 0 });
    expect(within(left).getByTestId("profile-close-account")).toBeOnTheScreen();
    for (const title of ["Tu plan", "Ajustes", "Ayuda"]) {
      expect(within(right).getByText(title)).toBeOnTheScreen();
    }
    expect(screen.getAllByRole("button", { name: "Cerrar sesión" })).toHaveLength(1);
  });

  it("opens the inbox in a centred 640 pt column (19T)", async () => {
    const screen = await openOnTablet();

    await fireEvent.press(screen.getByRole("button", { name: /^Notificaciones/ }));

    const column = await screen.findByTestId("tablet-column");
    expect(column).toHaveStyle({ alignSelf: "center", maxWidth: 640 });
    expect(
      within(column).getByText("Tu clase de Reformer Pilates fue cancelada."),
    ).toBeOnTheScreen();
  });

  it("edits the profile in a centred 560 pt column (22T)", async () => {
    const screen = await openOnTablet();

    await fireEvent.press(screen.getByRole("button", { name: "Editar" }));

    await waitFor(() => expect(screen.getByLabelText("Nombre")).toBeOnTheScreen());
    // Walkthrough n.º 6: one column, the button at the end of the form.
    const column = screen.getByTestId("tablet-column");
    expect(column).toHaveStyle({ maxWidth: 560 });
    expect(within(column).getByLabelText("Nombre")).toBeOnTheScreen();
    expect(within(column).getByRole("button", { name: "Guardar cambios" })).toBeOnTheScreen();
  });

  it("changes the password in a centred 480 pt column (23T)", async () => {
    const screen = await openOnTablet();

    await fireEvent.press(screen.getByRole("button", { name: "Cambiar contraseña" }));

    await waitFor(() => expect(screen.getByLabelText("Contraseña actual")).toBeOnTheScreen());
    // Walkthrough n.º 6: the button ends the form, inside the same column.
    const column = screen.getByTestId("tablet-column");
    expect(column).toHaveStyle({ maxWidth: 480 });
    expect(within(column).getByLabelText("Contraseña actual")).toBeOnTheScreen();
    expect(within(column).getByRole("button", { name: "Guardar contraseña" })).toBeOnTheScreen();
  });

  it("keeps «Enviar comentario» in the form's 560 pt column (25T)", async () => {
    const screen = await openOnTablet();

    await fireEvent.press(screen.getByRole("button", { name: "Envíanos tu opinión" }));

    // Walkthrough n.º 6 and 15: the button ends the form, in its 560 pt column.
    const end = await screen.findByTestId("feedback-form");
    expect(within(end).getByRole("button", { name: "Enviar comentario" })).toBeOnTheScreen();
  });
});
