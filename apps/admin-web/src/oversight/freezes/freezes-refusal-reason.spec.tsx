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
  planName: "Trimestral 24 clases",
  startsOn: "2026-11-21",
  endsOn: "2026-11-24",
  reason: "Viaje",
  state: "requested",
};

// W16 B/C (owner 2026-11-19): «Motivo si rechazas (opcional)», sent to the
// Client with the refusal and shown in «Decididos».
describe("congelamiento: motivo si rechazas", () => {
  useMockServer();

  const openReview = async () => {
    const decisions: unknown[] = [];
    server.use(...signedInHandlers());
    server.use(
      http.get(apiUrl(freezesPath), () => jsonResponse([requested])),
      http.post(
        apiUrl(`${freezesPath}/freeze-1/decision`),
        async ({ request }) => {
          decisions.push(await request.json());
          return jsonResponse({ state: "refused" });
        },
      ),
    );
    const user = userEvent.setup();
    renderAdmin("/clientas/congelamientos");
    const row = (await screen.findByText("Valeria Quiroga")).closest(
      "tr",
    ) as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "Revisar" }));
    const panel = await screen.findByRole("dialog", {
      name: "Valeria Quiroga · congelamiento",
    });
    return { decisions, user, panel };
  };

  it("sends the trimmed reason with the confirmed refusal", async () => {
    const { decisions, user, panel } = await openReview();
    const reason = within(panel).getByLabelText(
      "Motivo si rechazas (opcional)",
    );
    expect(reason).toHaveAccessibleDescription("Se lo enviamos a Valeria");
    await user.type(reason, "  Esas fechas el estudio está cerrado ");
    await user.click(within(panel).getByRole("button", { name: "Rechazar" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Sí, rechazar" }),
    );
    await waitFor(() =>
      expect(decisions).toEqual([
        {
          decision: "refused",
          refusalReason: "Esas fechas el estudio está cerrado",
        },
      ]),
    );
  });

  it("never sends the reason with an approval", async () => {
    const { decisions, user, panel } = await openReview();
    await user.type(
      within(panel).getByLabelText("Motivo si rechazas (opcional)"),
      "No",
    );
    await user.click(within(panel).getByRole("button", { name: "Aprobar" }));
    await waitFor(() => expect(decisions).toEqual([{ decision: "approved" }]));
  });

  it("shows a refusal's reason in «Decididos»", async () => {
    server.use(...signedInHandlers());
    server.use(
      http.get(apiUrl(`${freezesPath}/decided`), () =>
        jsonResponse([
          {
            ...requested,
            state: "refused",
            planEndsOn: "2027-02-08",
            planEndsOnAfter: null,
            decidedAt: "2026-11-19T15:00:00.000Z",
            decidedByName: "Paola Mendoza",
            refusalReason: "Esas fechas el estudio está cerrado",
          },
        ]),
      ),
    );
    const user = userEvent.setup();
    renderAdmin("/clientas/congelamientos");
    await user.click(await screen.findByRole("button", { name: "Decididos" }));
    const row = (await screen.findByText("Valeria Quiroga")).closest(
      "tr",
    ) as HTMLElement;
    expect(within(row).getByText("Rechazada")).toBeInTheDocument();
    expect(
      within(row).getByText("Esas fechas el estudio está cerrado"),
    ).toBeInTheDocument();
  });
});
