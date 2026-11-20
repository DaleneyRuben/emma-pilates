import type { FreezeReviewDto } from "@pilates/api-contracts";
import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { freezesPath } from "../../test/home-handlers";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const valeria: FreezeReviewDto = {
  id: "freeze-1",
  clientName: "Valeria Quiroga",
  clientPhoto: null,
  planName: "Trimestral 24 clases",
  remainingClassAllowance: 18,
  startsOn: "2026-11-21",
  endsOn: "2026-11-24",
  reason: "Viaje",
  state: "requested",
  planEndsOn: "2027-02-08",
  planEndsOnAfter: "2027-02-12",
  decidedAt: null,
  decidedByName: null,
};
const daniela: FreezeReviewDto = {
  ...valeria,
  id: "freeze-2",
  clientName: "Daniela Rojas",
  startsOn: "2026-12-01",
  endsOn: "2026-12-03",
  planEndsOn: "2027-02-08",
  planEndsOnAfter: "2027-02-11",
};

const rowOf = async (name: string) =>
  (await screen.findByText(name)).closest("tr") as HTMLElement;

// FIX-091 (W16 A + B): each pending request says what it asks and what the
// Plan would end on, with «Revisar»; the panel it opens holds the context
// and the decision.
describe("Congelamientos por decidir", () => {
  useMockServer();
  const decisions: unknown[] = [];
  beforeEach(() => {
    decisions.length = 0;
    server.use(...signedInHandlers());
    server.use(
      http.get(apiUrl(freezesPath), () => jsonResponse([valeria, daniela])),
      http.post(
        apiUrl(`${freezesPath}/freeze-1/decision`),
        async ({ request }) => {
          const body = (await request.json()) as { decision: string };
          decisions.push(body);
          return jsonResponse({ ...valeria, state: body.decision });
        },
      ),
    );
  });

  it("lists what each one asks, its days, and the new end, with «Revisar»", async () => {
    renderAdmin("/clientas/congelamientos");

    const row = await rowOf("Valeria Quiroga");
    const views = screen.getByRole("group", { name: "Congelamientos" });
    expect(
      within(views).getByRole("button", { name: "Por decidir · 2" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(views).getByRole("button", { name: "Decididos" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      within(row).getByRole("cell", { name: "sáb 21 al mar 24 nov" }),
    ).toHaveAttribute("data-label", "Pide");
    expect(within(row).getByRole("cell", { name: "4 días" })).toHaveAttribute(
      "data-label",
      "Días",
    );
    expect(
      within(row).getByRole("cell", { name: "vie 12 feb" }),
    ).toHaveAttribute("data-label", "Vencería");
    expect(
      within(row).getByRole("button", { name: "Revisar" }),
    ).toBeInTheDocument();
    expect(
      within(row).queryByRole("button", { name: "Aprobar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Aprobar o rechazar se hace dentro de cada solicitud; rechazar pide confirmación.",
      ),
    ).toBeInTheDocument();
  });

  it("opens the request with its context and approves it", async () => {
    const { user } = renderAdmin("/clientas/congelamientos");
    const row = await rowOf("Valeria Quiroga");
    await user.click(within(row).getByRole("button", { name: "Revisar" }));

    const panel = await screen.findByRole("dialog", {
      name: "Valeria Quiroga · congelamiento",
    });
    const value = (label: string) =>
      within(panel).getByText(label).nextElementSibling?.textContent;
    expect(value("Pide")).toBe("sáb 21 al mar 24 nov (4 días)");
    expect(value("Plan")).toBe("Trimestral 24 clases · 18 restantes");
    expect(value("Vencería")).toBe("vie 12 feb (antes lun 8 feb)");
    expect(value("Motivo")).toBe("Viaje");

    await user.click(within(panel).getByRole("button", { name: "Aprobar" }));
    await waitFor(() => expect(decisions).toEqual([{ decision: "approved" }]));
    expect(
      await screen.findByText("Congelamiento aprobado"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", {
          name: "Valeria Quiroga · congelamiento",
        }),
      ).not.toBeInTheDocument(),
    );
  });

  it("asks before refusing from the panel and sends nothing until confirmed", async () => {
    const { user } = renderAdmin("/clientas/congelamientos");
    const row = await rowOf("Valeria Quiroga");
    await user.click(within(row).getByRole("button", { name: "Revisar" }));
    const panel = await screen.findByRole("dialog", {
      name: "Valeria Quiroga · congelamiento",
    });

    await user.click(within(panel).getByRole("button", { name: "Rechazar" }));
    const confirm = await screen.findByRole("alertdialog", {
      name: "¿Rechazar el congelamiento de Valeria Quiroga?",
    });
    expect(decisions).toEqual([]);
    await user.click(
      within(confirm).getByRole("button", { name: "Sí, rechazar" }),
    );
    await waitFor(() => expect(decisions).toEqual([{ decision: "refused" }]));
    expect(
      await screen.findByText("Congelamiento rechazado"),
    ).toBeInTheDocument();
  });
});
