import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

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

const openCancelClass = async () => {
  const screen = await render(
    <App runtime={createStaffRuntime(routeFetcher(routes), "administrator")} />,
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Cancelar una clase" })).toBeOnTheScreen(),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Cancelar una clase" }));
  await waitFor(() => expect(screen.getByTestId("cancel-class-day-strip")).toBeOnTheScreen());
  return screen;
};

// v2 S13 (walkthrough 7 and 23): one Branch is fixed, and the dates reach 30 days.
describe("Cancelar una clase (S13)", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("shows the only Branch fixed, with nothing to open", async () => {
    const screen = await openCancelClass();

    expect(screen.getByTestId("branch-field-fixed")).toHaveTextContent("Sucursal Centro");
    expect(screen.queryByRole("button", { name: /^Sucursal/ })).toBeNull();
  });

  it("reaches a class 30 days ahead from «Otra»", async () => {
    const screen = await openCancelClass();

    await fireEvent.press(screen.getByRole("button", { name: "Elegir otra fecha, hasta 30 días" }));
    const days = screen.getAllByTestId(/^cancel-class-other-/);
    expect(days).toHaveLength(24);
    await fireEvent.press(days[days.length - 1]!);
    expect(screen.getByRole("button", { name: "Elegir otra fecha, hasta 30 días" })).toHaveProp(
      "accessibilityState",
      { selected: true },
    );
    expect(screen.getByText("Este día no hay clases")).toBeOnTheScreen();
  });
});
