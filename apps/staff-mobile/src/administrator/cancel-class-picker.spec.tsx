import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

const administrator = {
  id: "staff-2",
  name: "Paola Mendoza",
  email: "paola.mendoza@example.com",
  phone: null,
  role: "administrator",
  branches: [],
};

const routes = {
  "/api/v1/staff-members/current": () => jsonResponse(administrator),
  "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 0 }),
  "/api/v1/administrator/payments/pending": () => jsonResponse([]),
  "/api/v1/branches": () =>
    jsonResponse([{ id: "branch-centro", name: "Centro", address: "Calle Ayacucho 245" }]),
  "/api/v1/class-types": () => jsonResponse([]),
  "/api/v1/administrator/sessions": () => jsonResponse([]),
};

// MOB-041: S13's «Sucursal:» row ends in the 16 pt Texto tenue chevron that
// points down while the picker is closed and up while it is open.
describe("Cancel a class Branch picker", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("turns the picker chevron with the picker", async () => {
    const screen = await render(
      <App runtime={createStaffRuntime(routeFetcher(routes), "administrator")} />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancelar una clase" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar una clase" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sucursal: Centro" })).toBeOnTheScreen();
    });
    const picker = screen.getByTestId("branch-picker-chevron", hidden);
    expect(picker).toHaveProp("stroke", "#766D69");
    expect(picker).toHaveProp("width", 16);
    expect(screen.getByTestId("branch-picker-chevron-down", hidden)).toBeOnTheScreen();
    expect(screen.queryByText("▾")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Sucursal: Centro" }));
    expect(screen.getByTestId("branch-picker-chevron-up", hidden)).toBeOnTheScreen();
  });
});
