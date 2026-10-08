import { cleanup, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { routeFetcher, jsonResponse } from "../test-support";
import { entry, inDays, openApp, page, routes } from "./nutritionist-test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

// MOB-042: S15's row is a Lora time column, a thin divider, the Client over
// the kind, and the chevron.
describe("Nutritionist agenda rows", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("draws the agenda row as the frame does", async () => {
    const screen = await openApp(
      routeFetcher(
        routes({
          "/api/v1/nutritionist/evaluations": () =>
            jsonResponse(page([entry("eval-1", inDays(1), "09:00", "Valeria Áñez", "first")])),
        }),
      ),
    );

    await waitFor(() => {
      expect(screen.getByText("Valeria Áñez")).toBeOnTheScreen();
    });
    expect(screen.getByText("09:00")).toHaveStyle({
      color: "#4A4A4A",
      fontFamily: "Lora_500Medium",
      fontSize: 19,
      fontVariant: ["tabular-nums"],
    });
    expect(screen.getByText("45 min")).toHaveStyle({ color: "#7A716D", fontSize: 12 });
    expect(screen.getByTestId("agenda-row-divider")).toHaveStyle({
      backgroundColor: "#EFE7DE",
      height: 38,
      width: 1,
    });
    expect(screen.getByText("Valeria Áñez")).toHaveStyle({ color: "#4A4A4A", fontSize: 16 });
    expect(screen.getByText("Primera evaluación")).toHaveStyle({ color: "#766D69", fontSize: 13 });
    expect(screen.getByRole("button", { name: "09:00 Valeria Áñez" })).toHaveStyle({
      alignItems: "center",
      flexDirection: "row",
      gap: 16,
      padding: 18,
    });
    const chevron = screen.getByTestId("chevron", hidden);
    expect(chevron).toHaveProp("stroke", "#B78380");
    expect(chevron).toHaveProp("width", 19);
  });
});
