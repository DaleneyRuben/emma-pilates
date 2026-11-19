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

// FIX-088 review: a phone card still names the reason and the new plan end,
// since Congelamientos has no panel to read them in before deciding.
describe("Congelamientos on a phone", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("keeps the reason, the plan end and the decision in the card", async () => {
    server.use(http.get(apiUrl(freezesPath), () => jsonResponse([pending])));
    renderAdmin("/clientas/congelamientos");

    const row = (await screen.findByText("Valeria Quiroga")).closest("tr")!;
    const card = compactCard(row);
    expect(card.compact).toBe(true);
    expect(card.detail).toContain("Viaje");
    expect(card.detail).toContain("vie 5 feb → vie 12 feb");
    expect(within(row).getByRole("button", { name: "Aprobar" })).toBeVisible();
  });
});
