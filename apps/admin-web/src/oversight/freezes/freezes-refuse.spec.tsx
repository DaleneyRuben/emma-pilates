import type { FreezeReviewDto } from "@pilates/api-contracts";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { freezesPath } from "../../test/home-handlers";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const requested: FreezeReviewDto = {
  id: "freeze-1",
  clientName: "Valeria Quiroga",
  clientPhoto: null,
  planName: "Paquete de 12 clases",
  startsOn: "2026-11-10",
  endsOn: "2026-11-24",
  reason: "Viaje",
  state: "requested",
};

// FIX-089: a destructive decision takes the secondary look and asks first.
describe("Rechazar un congelamiento", () => {
  useMockServer();

  it("asks before refusing and sends nothing until confirmed", async () => {
    const decisions: unknown[] = [];
    server.use(...signedInHandlers());
    server.use(
      http.get(apiUrl(freezesPath), () => jsonResponse([requested])),
      http.post(
        apiUrl(`${freezesPath}/freeze-1/decision`),
        async ({ request }) => {
          decisions.push(await request.json());
          return jsonResponse({ ...requested, state: "refused" });
        },
      ),
    );
    const user = userEvent.setup();
    renderAdmin("/clientas/congelamientos");

    const row = (await screen.findByText("Valeria Quiroga")).closest(
      "tr",
    ) as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "Rechazar" }));

    const dialog = await screen.findByRole("alertdialog", {
      name: "¿Rechazar el congelamiento de Valeria Quiroga?",
    });
    expect(decisions).toEqual([]);
    await user.click(
      within(dialog).getByRole("button", { name: "Sí, rechazar" }),
    );
    await waitFor(() => expect(decisions).toEqual([{ decision: "refused" }]));
  });
});
