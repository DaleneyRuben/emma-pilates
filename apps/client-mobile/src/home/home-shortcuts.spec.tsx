import { cleanup, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(20_000);

const hidden = { includeHiddenElements: true };

const profile = {
  id: "client-1",
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: null,
  referralCode: "REF-LUCIA",
};

const active = {
  status: "active",
  subscription: {
    id: "subscription-1",
    planName: "Paquete de 8 clases",
    originalClassAllowance: 8,
    remainingClassAllowance: 5,
    startsOn: "2026-09-11",
    endsOn: "2026-10-11",
  },
};

const promotion = {
  id: "promotion-1",
  headline: "Noviembre en Reformer",
  description: "Trae a una amiga y las dos entrenan juntas el sábado.",
  image: {
    sources: [
      {
        url: "/api/v1/promotion-images/asset-1/promotion_1440/version-1",
        mediaType: "image/webp",
        width: 1440,
        height: 810,
      },
    ],
  },
};

async function openHome(subscription: unknown) {
  const screen = await render(
    <App
      runtime={createClientRuntime(
        routeFetcher({
          "/api/v1/clients/current": () => jsonResponse(profile),
          "/api/v1/clients/current/subscription": () => jsonResponse(subscription),
          "/api/v1/promotions": () => jsonResponse([promotion]),
        }),
      )}
    />,
  );
  await waitFor(() => {
    expect(screen.getByText("Hola, Lucía")).toBeOnTheScreen();
  });
  return screen;
}

// Rosa Emma C02s, C02b: «Accesos rápidos» as a Lora 24 section of white
// tiles with the icon on a 50 disc; without a Plan the booking row is a
// locked soft inset. FIX-082: with a Plan, «Reservar una clase» left the
// tiles for the solid button.
describe("Client Home shortcut tiles", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("draws two white tiles with the icon on a 50 disc", async () => {
    const screen = await openHome(active);

    expect(screen.getByText("Accesos rápidos")).toHaveStyle({
      color: "#93615D",
      fontFamily: "Lora_500Medium",
      fontSize: 24,
    });
    for (const label of ["Evaluación nutricional", "Invita a una amiga"]) {
      expect(screen.getByRole("button", { name: label })).toHaveStyle({
        backgroundColor: "#FFFBFB",
        borderRadius: 20,
      });
      expect(screen.getByText(label)).toHaveStyle({
        fontFamily: "WorkSans_600SemiBold",
        fontSize: 16,
      });
    }
    expect(screen.getAllByTestId("shortcut-disc")[0]).toHaveStyle({
      backgroundColor: "#FEF6F2",
      width: 40,
    });
    expect(screen.getByTestId("glyph-health", hidden)).toHaveProp("stroke", "#93615D");
    expect(screen.getByTestId("glyph-health", hidden)).toHaveProp("width", 20);
    expect(screen.getByTestId("glyph-personAdd", hidden)).toHaveProp("width", 20);
    expect(screen.getByTestId("shortcut-tiles")).toHaveStyle({ flexDirection: "row", gap: 12 });
  });

  it("locks the booking row as a soft inset without a Plan", async () => {
    const screen = await openHome({ status: "none", subscription: null });

    const row = screen.getByRole("button", { name: "Reservar una clase" });
    expect(row).toBeDisabled();
    expect(row).toHaveStyle({
      backgroundColor: "#FEF6F2",
      borderColor: "#E7CCBF",
      borderRadius: 16,
    });
    expect(screen.getByText("Necesitas un plan activo")).toHaveStyle({
      color: "#93615D",
      fontSize: 13,
    });
    expect(screen.getByTestId("shortcut-lock", hidden)).toBeOnTheScreen();
    expect(screen.getByText("Agenda tu cita")).toBeOnTheScreen();
    // Walkthrough n.º 22 (C02b): only a paid plan can give a free class.
    expect(screen.queryByRole("button", { name: "Invita a una amiga" })).toBeNull();
    expect(screen.queryByText("Su primera clase es gratis")).toBeNull();
    // The evaluation is a full-width row with a chevron, as the board draws it.
    expect(screen.getByRole("button", { name: "Evaluación nutricional" })).toHaveStyle({
      backgroundColor: "#FFFBFB",
      flexDirection: "row",
    });
    expect(screen.getByTestId("shortcut-row-chevron", hidden)).toBeOnTheScreen();
  });

  it("leaves «Accesos rápidos» out for a guest-pass holder, her card before the promotions (C02f)", async () => {
    const screen = await openHome({
      status: "active",
      subscription: {
        ...active.subscription,
        planName: "Pase de invitada",
        originalClassAllowance: 1,
        remainingClassAllowance: 0,
        guestPass: { usedClassStartsAt: null, hostFirstName: "Lucía", hostInitials: "LF" },
      },
    });

    await waitFor(() => expect(screen.getByText("Te invitó Lucía")).toBeOnTheScreen());
    expect(screen.queryByText("Accesos rápidos")).toBeNull();
    const order = screen
      .getByTestId("home-scroll")
      .findAll((node) =>
        ["home-guest-pass-card", "promotions-carousel"].includes(node.props.testID),
      )
      .map((node) => node.props.testID as string);
    expect(order.indexOf("home-guest-pass-card")).toBeLessThan(
      order.indexOf("promotions-carousel"),
    );
  });
});
