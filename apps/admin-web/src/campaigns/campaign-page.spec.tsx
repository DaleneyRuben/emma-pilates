import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { emptyPageHandlers } from "../test/page-handlers";
import { findBrandedLoading } from "../test/branded-loading";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";

const campaignPath = "/api/v1/administrator/campaigns";
const previewPath = "/api/v1/administrator/campaigns/preview";
const submitted: unknown[] = [];
const keys: (string | null)[] = [];

const campaignHandlers = () => [
  http.get(apiUrl(previewPath), () =>
    jsonResponse({
      recipientCount: 12,
      owed: [
        { clientId: "22222222-2222-4222-8222-222222222222", name: "Sofía" },
      ],
      skipped: [],
      pastCampaigns: [
        { name: "Fin de año", grantedAt: "2026-11-17T14:00:00.000Z" },
      ],
    }),
  ),
  http.post(apiUrl(campaignPath), async ({ request }) => {
    submitted.push(await request.json());
    keys.push(request.headers.get("Idempotency-Key"));
    return jsonResponse(
      {
        name: "Inicio de año",
        classes: 1,
        granted: [
          { clientId: "11111111-1111-4111-8111-111111111111", name: "Lucía" },
        ],
        owed: [
          { clientId: "22222222-2222-4222-8222-222222222222", name: "Sofía" },
        ],
        skipped: [],
      },
      201,
    );
  }),
];

// FIX-091 (W13 A): the form lives in the «Nueva campaña» panel.
const openPanel = async (
  user: ReturnType<typeof renderAdmin>["user"],
): Promise<HTMLElement> => {
  await user.click(
    await screen.findByRole("button", { name: "Nueva campaña" }),
  );
  return screen.findByRole("dialog", { name: "Nueva campaña" });
};

describe("AW21 Campaña", () => {
  useMockServer();
  beforeEach(() => {
    submitted.length = 0;
    keys.length = 0;
    server.use(
      ...signedInHandlers(),
      ...emptyPageHandlers(),
      ...campaignHandlers(),
    );
  });

  it("opens from the Promociones tabs and shows how many Clients will receive the campaign", async () => {
    const { user } = renderAdmin("/promociones");

    // Follow-up 232: the campaign moved from Clientes to Promociones.
    await user.click(
      await screen.findByRole("link", { name: "Clases de campaña" }),
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Clases de campaña",
      }),
    ).toBeVisible();
    const history = await screen.findByRole("region", {
      name: "Campañas dadas",
    });
    expect(within(history).getByText("Fin de año")).toBeVisible();
    expect(within(history).getByText("mar 17 nov")).toBeVisible();

    const panel = await openPanel(user);
    expect(
      within(panel).getByRole("button", { name: "Clientas activas · 12" }),
    ).toHaveAttribute("aria-pressed", "true");
    const summary = within(panel).getByRole("region", { name: "Resumen" });
    expect(
      within(summary).getByText("Vas a regalar 12 clases en total"),
    ).toBeVisible();
    expect(
      within(summary).getByText("12 clientas la recibirán."),
    ).toBeVisible();
    expect(
      within(summary).getByText(
        "1 sin plan: se le suma en su próximo plan (Sofía).",
      ),
    ).toBeVisible();
    expect(within(summary).getByText("No se puede deshacer.")).toBeVisible();

    await user.clear(within(panel).getByLabelText("Clases para cada clienta"));
    await user.type(
      within(panel).getByLabelText("Clases para cada clienta"),
      "2",
    );
    expect(
      within(summary).getByText("Vas a regalar 24 clases en total"),
    ).toBeVisible();
    expect(
      within(panel).getByRole("button", { name: "Regalar 24 clases" }),
    ).toBeVisible();
  });

  it("says when no campaign was given yet", async () => {
    server.use(
      http.get(apiUrl(previewPath), () =>
        jsonResponse({
          recipientCount: 3,
          owed: [],
          skipped: [],
          pastCampaigns: [],
        }),
      ),
    );
    renderAdmin("/promociones/clases-de-campana");

    expect(
      await screen.findByText("Aún no diste ninguna campaña."),
    ).toBeVisible();
  });

  it("shows the branded loading state while the Clients load (WEB-045)", async () => {
    server.use(
      http.get(apiUrl(previewPath), () => new Promise(() => undefined)),
    );
    renderAdmin("/promociones/clases-de-campana");

    await findBrandedLoading("Cargando las clientas…");
  });

  it("submits the campaign and counts every Client it reached", async () => {
    const { user } = renderAdmin("/promociones/clases-de-campana");

    let panel = await openPanel(user);
    await user.type(
      within(panel).getByLabelText("Nombre de la campaña"),
      "Inicio de año",
    );
    await user.clear(within(panel).getByLabelText("Clases para cada clienta"));
    await user.type(
      within(panel).getByLabelText("Clases para cada clienta"),
      "1",
    );
    await user.click(
      within(panel).getByRole("button", { name: "Regalar 12 clases" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Confirmar campaña" }),
    );

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]).toEqual({ name: "Inicio de año", classes: 1 });
    expect(
      await screen.findByText(
        "2 clientas recibieron 1 clase extra. 1 sin plan: se le suma en su próximo plan (Sofía).",
      ),
    ).toBeVisible();
    // The panel closes on success; walkthrough finding 92: the form empties
    // so a second click gives nothing.
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Nueva campaña" }),
      ).not.toBeInTheDocument(),
    );
    panel = await openPanel(user);
    expect(within(panel).getByLabelText("Nombre de la campaña")).toHaveValue(
      "",
    );
    expect(
      within(panel).getByLabelText("Clases para cada clienta"),
    ).toHaveValue("1");
  });

  // Review of walkthrough finding 92: a campaign given again on purpose is a
  // new grant, not a replay of the first answer under the same key.
  it("sends a campaign given twice with a new key each time", async () => {
    const { user } = renderAdmin("/promociones/clases-de-campana");
    const give = async () => {
      const panel = await openPanel(user);
      await user.type(
        within(panel).getByLabelText("Nombre de la campaña"),
        "Inicio de año",
      );
      await user.click(within(panel).getByRole("button", { name: /^Regalar/ }));
      await user.click(
        await screen.findByRole("button", { name: "Confirmar campaña" }),
      );
    };

    await give();
    await waitFor(() => expect(submitted).toHaveLength(1));
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Nueva campaña" }),
      ).not.toBeInTheDocument(),
    );
    await give();
    await waitFor(() => expect(submitted).toHaveLength(2));

    expect(keys[0]).not.toBeNull();
    expect(keys[1]).not.toBe(keys[0]);
  });

  it("warns when a campaign with the same name was already given", async () => {
    const { user } = renderAdmin("/promociones/clases-de-campana");

    await openPanel(user);
    await user.type(
      screen.getByLabelText("Nombre de la campaña"),
      "fin de año",
    );

    expect(
      screen.getByText(
        /^Ya diste la campaña «Fin de año» el 17 de noviembre( de 2026)?\. Si la das otra vez, cada clienta recibe las clases de nuevo\.$/,
      ),
    ).toBeVisible();
    await user.clear(screen.getByLabelText("Nombre de la campaña"));
    await user.type(screen.getByLabelText("Nombre de la campaña"), "Navidad");
    expect(screen.queryByText(/Ya diste/)).not.toBeInTheDocument();
  });

  // FIX-064 (walkthrough finding 90): founders are in; only an empty studio
  // has nobody to give the classes to.
  it("offers no grant only when there is no active Client", async () => {
    server.use(
      http.get(apiUrl(previewPath), () =>
        jsonResponse({ recipientCount: 0, owed: [], skipped: [] }),
      ),
    );
    const { user } = renderAdmin("/promociones/clases-de-campana");

    const panel = await openPanel(user);
    expect(within(panel).getByText("0 clientas la recibirán.")).toBeVisible();
    expect(within(panel).queryByText(/fundadora/)).not.toBeInTheDocument();
    expect(within(panel).queryByText(/sin plan/)).not.toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: /^Regalar/ }),
    ).toBeDisabled();
  });

  it("confirms that every active Client receives the classes", async () => {
    const { user } = renderAdmin("/promociones/clases-de-campana");

    const panel = await openPanel(user);
    await user.type(
      within(panel).getByLabelText("Nombre de la campaña"),
      "Inicio de año",
    );
    await user.click(within(panel).getByRole("button", { name: /^Regalar/ }));

    expect(
      await screen.findByText(
        "Cada clienta activa recibe las clases: en su plan vigente o, si no tiene uno, en su próximo plan. Ningún precio cambia.",
      ),
    ).toBeVisible();
  });
});
