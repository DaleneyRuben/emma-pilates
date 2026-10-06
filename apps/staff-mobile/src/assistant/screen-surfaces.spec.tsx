import { cleanup, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";
import { Dimensions, StyleSheet } from "react-native";

import App from "../../App";
import { createStaffRuntime, jsonResponse, routeFetcher } from "../test-support";
import { assistantRoutes, openClientSearch, openLucia, overview } from "./assistant-fixtures";

jest.setTimeout(20_000);

const withoutPlan = () => ({
  ...assistantRoutes(),
  "/api/v1/assistant/clients/client-lucia": () =>
    jsonResponse({ ...overview, subscription: { status: "none", subscription: null } }),
});

// MOB-038: the screens moved onto Superficie, so S06's surfaces follow the frames.
describe("Assistant surfaces on Superficie", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
    jest.restoreAllMocks();
  });

  it("draws S06's «Sin plan activo» as the frames' dashed neutral box", async () => {
    const screen = await openLucia(withoutPlan());

    expect(screen.getByText("Sin plan activo").parent).toHaveStyle({
      backgroundColor: "rgba(216,201,187,0.14)",
      borderColor: "#D8C9BB",
      borderStyle: "dashed",
      borderWidth: 1,
    });
  });

  it("leaves the tablet's empty panel unfilled, as the split-view frames do", async () => {
    jest
      .spyOn(Dimensions, "get")
      .mockReturnValue({ width: 1024, height: 1366, scale: 2, fontScale: 1 });
    const screen = await openClientSearch(assistantRoutes());

    const panel = screen.getByText("Selecciona un cliente para ver sus detalles").parent;
    expect(StyleSheet.flatten(panel?.props.style)).not.toHaveProperty("backgroundColor");
  });

  it("rings the unread dot in the header's Superficie", async () => {
    const screen = await render(
      <App
        runtime={createStaffRuntime(
          routeFetcher({
            ...assistantRoutes(),
            "/api/v1/notifications/unread-count": () => jsonResponse({ unread: 2 }),
          }),
          "assistant",
        )}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("account-avatar-dot")).toHaveStyle({ borderColor: "#FAF7F2" });
    });
  });
});
