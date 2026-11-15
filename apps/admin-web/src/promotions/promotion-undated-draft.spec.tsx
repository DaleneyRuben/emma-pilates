import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import {
  promotionList,
  promotionRow,
  promotionsPath,
  reformer,
} from "../test/promotion-fixtures";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";

// Finding 82 (follow-up 266): a draft is private, so «Guardar borrador»
// keeps it without dates; publishing still needs both.
const undated = promotionRow("07", "Clases de verano", {
  displayStartsOn: null,
  displayEndsOn: null,
});

type Call = { method: string; body: unknown };

describe("AW18 a Promotion draft without dates (finding 82)", () => {
  useMockServer();
  const calls: Call[] = [];
  beforeEach(() => {
    calls.length = 0;
    server.use(
      ...signedInHandlers(),
      promotionList([reformer, undated]),
      http.post(apiUrl(promotionsPath), async ({ request }) => {
        const body = await request.json();
        calls.push({ method: "POST", body });
        return jsonResponse({ ...undated, headline: "Nueva" }, 201);
      }),
      http.put(apiUrl(`${promotionsPath}/:id`), async ({ request }) => {
        const body = await request.json();
        calls.push({ method: "PUT", body });
        return jsonResponse(reformer);
      }),
    );
  });

  it("saves a new draft with only its title and description", async () => {
    const { user } = renderAdmin("/promociones");
    await user.click(
      await screen.findByRole("button", { name: "Nueva promoción" }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Nueva promoción",
    });
    await user.type(within(panel).getByLabelText("Título"), "Nueva");
    await user.type(
      within(panel).getByLabelText("Descripción"),
      "Pronto contamos las fechas.",
    );

    await user.click(
      within(panel).getByRole("button", { name: "Guardar borrador" }),
    );

    await waitFor(() =>
      expect(calls).toEqual([
        {
          method: "POST",
          body: {
            headline: "Nueva",
            description: "Pronto contamos las fechas.",
            displayStartsOn: null,
            displayEndsOn: null,
            imageAssetId: null,
          },
        },
      ]),
    );
    expect(
      await screen.findByText("Promoción «Nueva» guardada como borrador."),
    ).toBeVisible();
  });

  it("shows an undated draft on its card and opens it with empty dates", async () => {
    const { user } = renderAdmin("/promociones");
    const card = await screen.findByRole("article", { name: undated.headline });

    expect(within(card).getByText("Sin fechas todavía")).toBeVisible();

    await user.click(
      within(card).getByRole("button", { name: undated.headline }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Editar promoción",
    });
    expect(within(panel).getByLabelText("Fecha de inicio")).toHaveValue("");
    expect(within(panel).getByLabelText("Fecha de fin")).toHaveValue("");
    expect(
      within(panel).getByRole("button", { name: "Publicar" }),
    ).toBeDisabled();
  });

  it("keeps both dates required on a published Promotion", async () => {
    const { user } = renderAdmin("/promociones");
    await user.click(
      await screen.findByRole("button", { name: reformer.headline }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Editar promoción",
    });

    await user.clear(within(panel).getByLabelText("Fecha de fin"));
    await user.click(
      within(panel).getByRole("button", { name: "Guardar cambios" }),
    );

    expect(
      within(panel).getByLabelText("Fecha de fin"),
    ).toHaveAccessibleDescription(
      expect.stringContaining("Elige la fecha de fin."),
    );
    expect(calls).toEqual([]);
  });
});
