import { screen, waitFor } from "@testing-library/react";
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
      await screen.findByRole("heading", { level: 1, name: "Clases de campaña" }),
    ).toBeVisible();
    expect(await screen.findByText("12 clientas la recibirán.")).toBeVisible();
    expect(
      screen.getByText("1 sin plan: se le suma en su próximo plan (Sofía)."),
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

    await user.type(
      await screen.findByLabelText("Nombre de la campaña"),
      "Inicio de año",
    );
    await user.clear(screen.getByLabelText("Clases extra"));
    await user.type(screen.getByLabelText("Clases extra"), "1");
    await user.click(screen.getByRole("button", { name: "Dar las clases" }));
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
    // Walkthrough finding 92: the form empties so a second click gives nothing.
    expect(screen.getByLabelText("Nombre de la campaña")).toHaveValue("");
    expect(screen.getByLabelText("Clases extra")).toHaveValue("1");
  });

  // Review of walkthrough finding 92: a campaign given again on purpose is a
  // new grant, not a replay of the first answer under the same key.
  it("sends a campaign given twice with a new key each time", async () => {
    const { user } = renderAdmin("/promociones/clases-de-campana");
    const give = async () => {
      await user.type(
        await screen.findByLabelText("Nombre de la campaña"),
        "Inicio de año",
      );
      await user.click(screen.getByRole("button", { name: "Dar las clases" }));
      await user.click(
        await screen.findByRole("button", { name: "Confirmar campaña" }),
      );
    };

    await give();
    await waitFor(() => expect(submitted).toHaveLength(1));
    await waitFor(() =>
      expect(screen.getByLabelText("Nombre de la campaña")).toHaveValue(""),
    );
    await give();
    await waitFor(() => expect(submitted).toHaveLength(2));

    expect(keys[0]).not.toBeNull();
    expect(keys[1]).not.toBe(keys[0]);
  });

  it("warns when a campaign with the same name was already given", async () => {
    const { user } = renderAdmin("/promociones/clases-de-campana");

    await user.type(
      await screen.findByLabelText("Nombre de la campaña"),
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
    renderAdmin("/promociones/clases-de-campana");

    expect(await screen.findByText("0 clientas la recibirán.")).toBeVisible();
    expect(screen.queryByText(/fundadora/)).not.toBeInTheDocument();
    expect(screen.queryByText(/sin plan/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Dar las clases" }),
    ).toBeDisabled();
  });

  it("confirms that every active Client receives the classes", async () => {
    const { user } = renderAdmin("/promociones/clases-de-campana");

    await user.type(
      await screen.findByLabelText("Nombre de la campaña"),
      "Inicio de año",
    );
    await user.click(screen.getByRole("button", { name: "Dar las clases" }));

    expect(
      await screen.findByText(
        "Cada clienta activa recibe las clases: en su plan vigente o, si no tiene uno, en su próximo plan. Ningún precio cambia.",
      ),
    ).toBeVisible();
  });
});
