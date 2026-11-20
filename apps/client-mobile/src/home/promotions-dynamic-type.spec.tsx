import { cleanup, render, waitFor } from "@testing-library/react-native";
import { clearMobileQueryCache, maxTextScale, textVariants } from "@pilates/mobile-core";
import { StyleSheet } from "react-native";

import App from "../../App";
import { createClientRuntime, jsonResponse, routeFetcher } from "../test-support";

jest.setTimeout(30_000);

const profile = {
  id: "client-1",
  name: "Lucía Fernández",
  email: "lucia@example.com",
  phone: null,
  referralCode: "REF-LUCIA",
};

const page = (items: unknown[]) => ({ items, hasMore: false, nextCursor: null });

const promotion = {
  id: "promotion-1",
  headline: "Nueva sala de Reformer en Urubó",
  description: "Desde el lunes 5 abrimos la segunda sala con seis camas nuevas.",
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

// UX-016 finding A2: a line box that does not fit the font clips the
// descenders. Follow-up 285: the line height comes with the variant, sized
// for the face, and the text grows up to 1.3 times with the phone.
describe("Promotions carousel Dynamic Type", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("takes the headline's and the description's line height from the type scale", async () => {
    const fetcher = routeFetcher({
      "/api/v1/clients/current": () => jsonResponse(profile),
      "/api/v1/clients/current/subscription": () => jsonResponse({ status: "none" }),
      "/api/v1/clients/current/referrals": () =>
        jsonResponse({ referralCode: "REF-LUCIA", referrals: [] }),
      "/api/v1/evaluations?scope=upcoming": () => jsonResponse(page([])),
      "/api/v1/promotions": () => jsonResponse([promotion]),
    });
    const screen = await render(<App runtime={createClientRuntime(fetcher)} />);

    await waitFor(() => {
      expect(screen.getByText(promotion.headline)).toBeOnTheScreen();
    });
    const headline = StyleSheet.flatten(screen.getByText(promotion.headline).props.style);
    const description = StyleSheet.flatten(screen.getByText(promotion.description).props.style);

    expect(headline.lineHeight).toBe(textVariants["titulo-bloque"].lineHeight);
    expect(description.lineHeight).toBe(textVariants.cuerpo.lineHeight);
    expect(screen.getByText(promotion.headline)).toHaveProp("maxFontSizeMultiplier", maxTextScale);
    expect(screen.getByText(promotion.description)).toHaveProp(
      "maxFontSizeMultiplier",
      maxTextScale,
    );
  });
});
