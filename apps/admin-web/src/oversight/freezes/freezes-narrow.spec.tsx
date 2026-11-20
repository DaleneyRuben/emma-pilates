import type { FreezeReviewDto } from "@pilates/api-contracts";
import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { compactCard } from "../../test/compact-card";
import { freezesPath } from "../../test/home-handlers";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";

const pending: FreezeReviewDto = {
  id: "freeze-1",
  clientName: "Valeria Quiroga",
  clientPhoto: null,
  planName: "Paquete de 12 clases",
  startsOn: "2026-11-10",
  endsOn: "2026-11-16",
  reason: "Viaje",
  state: "requested",
  planEndsOn: "2027-02-05",
  planEndsOnAfter: "2027-02-12",
  decidedAt: null,
  decidedByName: null,
};

// FIX-088 review: a phone card names what she asks and the new plan end;
// FIX-091 (W16 B) moves the reason and the decision into the review panel.
describe("Congelamientos on a phone", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("keeps the days asked, the plan end and «Revisar» in the card", async () => {
    server.use(http.get(apiUrl(freezesPath), () => jsonResponse([pending])));
    renderAdmin("/clientas/congelamientos");

    const row = (await screen.findByText("Valeria Quiroga")).closest("tr")!;
    const card = compactCard(row);
    expect(card.compact).toBe(true);
    expect(card.detail).toContain("mar 10 al lun 16 nov");
    expect(card.detail).toContain("Vencería vie 12 feb");
    expect(within(row).getByRole("button", { name: "Revisar" })).toBeVisible();
  });
});
