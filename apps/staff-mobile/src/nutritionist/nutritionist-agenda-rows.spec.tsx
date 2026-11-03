import { cleanup, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { routeFetcher, jsonResponse } from "../test-support";
import { entry, inDays, openApp, page, routes } from "./nutritionist-test-support";

jest.setTimeout(20_000);

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
    // v2 S15: the start in Lora 20 and its length, the Client over the kind,
    // and «Cancelar evaluación» as the card's text action.
    expect(screen.getByText("09:00")).toHaveStyle({
      fontFamily: "Lora_400Regular",
      fontSize: 20,
      fontVariant: ["tabular-nums"],
    });
    // MOB-074 walk: the time never wraps in its column.
    expect(screen.getByText("09:00")).toHaveProp("numberOfLines", 1);
    expect(screen.getByText("45 min")).toHaveStyle({ color: "#6F6662", fontSize: 13 });
    expect(screen.getByText("Valeria Áñez")).toHaveStyle({ color: "#4A4A4A", fontSize: 16 });
    expect(screen.getByText("Primera evaluación")).toHaveStyle({ color: "#6F6662", fontSize: 13 });
    expect(screen.getByLabelText("09:00 Valeria Áñez")).toBeOnTheScreen();
    expect(screen.getByText("Cancelar evaluación")).toHaveStyle({ color: "#A04E3E" });
  });
});
