import { cleanup, fireEvent } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { assistantRoutes, openLucia, planQuotes } from "./assistant-fixtures";

jest.setTimeout(20_000);

const founderQuotes = {
  ...planQuotes,
  plans: [
    { ...planQuotes.plans[0], priceCentavos: 47_600, listPriceCentavos: 56_000 },
    planQuotes.plans[1],
  ],
};

describe("Assistant plan card labels", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("reads the price, and the list price when shown, in the plan card label", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/assistant/clients/client-lucia/plan-quotes": () => jsonResponse(founderQuotes),
    });

    await fireEvent.press(screen.getByRole("button", { name: "Registrar pago en efectivo" }));

    const founder = await screen.findByRole("button", { name: "Paquete de 8 clases" });
    expect(founder).toHaveProp("accessibilityHint", "Bs 476, antes Bs 560");
    expect(screen.getByRole("button", { name: "Paquete de 12 clases" })).toHaveProp(
      "accessibilityHint",
      "Bs 780",
    );
  });
});
