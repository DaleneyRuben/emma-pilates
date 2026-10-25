import { screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { emptyPageHandlers } from "../test/page-handlers";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";

const campaignPath = "/api/v1/administrator/campaigns";
const previewPath = "/api/v1/administrator/campaigns/preview";
const submitted: unknown[] = [];

const campaignHandlers = () => [
  http.get(apiUrl(previewPath), () =>
    jsonResponse({
      recipientCount: 12,
      skipped: [
        { clientId: "22222222-2222-4222-8222-222222222222", name: "Sofía" },
      ],
    }),
  ),
  http.post(apiUrl(campaignPath), async ({ request }) => {
    submitted.push(await request.json());
    return jsonResponse(
      {
        name: "Inicio de año",
        classes: 1,
        granted: [
          { clientId: "11111111-1111-4111-8111-111111111111", name: "Lucía" },
        ],
        skipped: [
          { clientId: "22222222-2222-4222-8222-222222222222", name: "Sofía" },
        ],
      },
      201,
    );
  }),
];

describe("AW21 Campaña", () => {
  useMockServer();
  beforeEach(() => {
    submitted.length = 0;
    server.use(
      ...signedInHandlers(),
      ...emptyPageHandlers(),
      ...campaignHandlers(),
    );
  });

  it("opens from Clientes and shows how many Clients will receive the campaign", async () => {
    const { user } = renderAdmin("/back-office/clientes");

    await user.click(
      await screen.findByRole("link", { name: "Dar clases de campaña" }),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Campaña" }),
    ).toBeVisible();
    expect(await screen.findByText("12 clientas la recibirán.")).toBeVisible();
    expect(screen.getByText("Sofía no tiene un plan vigente.")).toBeVisible();
  });

  it("submits the campaign and shows the granted and skipped counts", async () => {
    const { user } = renderAdmin("/back-office/clientes/campana");

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
        "1 clienta recibió 1 clase extra. 1 clienta no tiene un plan vigente: Sofía.",
      ),
    ).toBeVisible();
  });
});
