import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import {
  barre,
  promotionListHandler,
  promotionsPath,
  reformer,
} from "../test/promotion-fixtures";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";

const openEdit = async (headline: string) => {
  const rendered = renderAdmin("/promociones");
  await rendered.user.click(
    await screen.findByRole("button", { name: headline }),
  );
  const panel = await screen.findByRole("dialog", { name: "Editar promoción" });
  return { ...rendered, panel };
};

describe("AW18 Eliminar promoción (BKM-001: delete archives)", () => {
  useMockServer();
  const deleted: string[] = [];
  beforeEach(() => {
    deleted.length = 0;
    server.use(
      ...signedInHandlers(),
      promotionListHandler(() =>
        jsonResponse(deleted.length === 0 ? [reformer, barre] : [barre]),
      ),
    );
  });

  it("asks first, then archives the Promotion and drops it from the carousel", async () => {
    server.use(
      http.delete(apiUrl(`${promotionsPath}/:id`), ({ params }) => {
        deleted.push(String(params.id));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { panel, user } = await openEdit(reformer.headline);

    await user.click(
      within(panel).getByRole("button", { name: "Eliminar promoción" }),
    );
    const dialog = await screen.findByRole("alertdialog", {
      name: "¿Eliminar la promoción «Nueva sala de Reformer en Urubó»?",
    });
    expect(
      within(dialog).getByText(
        "Se quita del carrusel y de esta lista, y su imagen se borra. Esta acción no se puede deshacer.",
      ),
    ).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Volver" }));
    expect(deleted).toEqual([]);
    expect(panel).toBeInTheDocument();

    await user.click(
      within(panel).getByRole("button", { name: "Eliminar promoción" }),
    );
    await user.click(
      within(
        await screen.findByRole("alertdialog", {
          name: /Eliminar la promoción/,
        }),
      ).getByRole("button", { name: "Eliminar" }),
    );

    await waitFor(() => expect(deleted).toEqual([reformer.id]));
    await waitFor(() => expect(panel).not.toBeInTheDocument());
    expect(
      screen.getByText(
        "Promoción «Nueva sala de Reformer en Urubó» eliminada.",
      ),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        screen.queryByRole("article", { name: reformer.headline }),
      ).not.toBeInTheDocument(),
    );
    expect(
      within(screen.getByRole("article", { name: barre.headline })).getByText(
        "Posición 1",
      ),
    ).toBeInTheDocument();
  });

  it.each([
    [
      "promotion_not_found",
      404,
      "Esta promoción ya no existe. Cierra el panel y vuelve a abrir la lista.",
    ],
    [
      "promotion_archived",
      409,
      "Esta promoción ya fue eliminada. Cierra el panel y vuelve a abrir la lista.",
    ],
  ])(
    "explains a %s refusal inside the panel",
    async (code, status, message) => {
      server.use(
        http.delete(apiUrl(`${promotionsPath}/:id`), () =>
          problemResponse(status, code),
        ),
      );
      const { panel, user } = await openEdit(reformer.headline);

      await user.click(
        within(panel).getByRole("button", { name: "Eliminar promoción" }),
      );
      await user.click(
        within(
          await screen.findByRole("alertdialog", {
            name: /Eliminar la promoción/,
          }),
        ).getByRole("button", { name: "Eliminar" }),
      );

      expect(await within(panel).findByRole("alert")).toHaveTextContent(
        message,
      );
      expect(
        screen.queryByRole("alertdialog", { name: /Eliminar la promoción/ }),
      ).not.toBeInTheDocument();
    },
  );
});
