import { cleanup, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { routeFetcher, jsonResponse } from "../test-support";
import { entry, inDays, openApp, page, routes } from "./nutritionist-test-support";

jest.setTimeout(20_000);

// MOB-042: S15's row is a Lora time column, the Client over the kind; since
// E5 B the first appointment is the block and the rows come under «Después».
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
            jsonResponse(
              page([
                entry("eval-0", inDays(1), "08:00", "Carla Prueba", "follow_up"),
                entry("eval-1", inDays(1), "09:00", "Valeria Áñez", "first"),
              ]),
            ),
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
    expect(screen.getByText("45 min")).toHaveStyle({ color: "#93615D", fontSize: 13 });
    expect(screen.getByText("Valeria Áñez")).toHaveStyle({ color: "#93615D", fontSize: 16 });
    expect(screen.getByText("Mañana · Primera evaluación")).toHaveStyle({
      color: "#93615D",
      fontSize: 13,
    });
    expect(screen.getByLabelText("09:00 Valeria Áñez")).toBeOnTheScreen();
    expect(
      within(screen.getByTestId("cancel-evaluation-eval-1")).getByText("Cancelar evaluación"),
    ).toHaveStyle({ color: "#93615D" });
  });
});
