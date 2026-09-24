import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { addDays, boliviaToday } from "../lib/bolivia-time";
import { imageFile, useImageDimensions } from "../test/image-stubs";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import {
  horario,
  promotionList,
  promotionListHandler,
  promotionRow,
  promotionsPath,
} from "../test/promotion-fixtures";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";
import {
  uploadedAssetId,
  uploadHandlers,
  type UploadSeen,
} from "../test/upload-fixtures";

const today = boliviaToday();
const showing = promotionRow("01", "Nueva sala de Reformer en Urubó", {
  state: "active",
  publishedAt: "2026-09-20T12:00:00.000Z",
  displayStartsOn: addDays(today, -1),
  displayEndsOn: addDays(today, 30),
});
const scheduled = promotionRow("02", "Clases de Barre los sábados", {
  state: "scheduled",
  publishedAt: "2026-09-22T12:00:00.000Z",
  displayStartsOn: addDays(today, 1),
  displayEndsOn: addDays(today, 40),
});
const draftWithImage = promotionRow("05", "Semana de bienvenida");

type Call = { method: string; path: string; body: unknown };

const openEdit = async (headline: string) => {
  const rendered = renderAdmin("/promociones");
  await rendered.user.click(
    await screen.findByRole("button", { name: headline }),
  );
  const panel = await screen.findByRole("dialog", { name: "Editar promoción" });
  return { ...rendered, panel };
};

const buttonNames = (panel: HTMLElement) =>
  within(panel)
    .getAllByRole("button")
    .map((button) => button.textContent?.trim() ?? "")
    .filter((name) => name !== "");

describe("AW18 Editar promoción (follow-up 39)", () => {
  useMockServer();
  useImageDimensions({ "otra.png": [1600, 900] });
  const calls: Call[] = [];
  const seen: UploadSeen = { polls: 0 };
  beforeEach(() => {
    calls.length = 0;
    seen.polls = 0;
    server.use(
      ...signedInHandlers(),
      promotionList([showing, scheduled, horario, draftWithImage]),
      ...uploadHandlers(seen),
      http.put(apiUrl(`${promotionsPath}/:id`), async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        calls.push({ method: "PUT", path: String(params.id), body });
        return jsonResponse({
          ...showing,
          ...body,
          id: String(params.id),
          image: showing.image,
        });
      }),
      http.post(apiUrl(`${promotionsPath}/:id/publish`), ({ params }) => {
        calls.push({
          method: "POST",
          path: `${String(params.id)}/publish`,
          body: null,
        });
        return jsonResponse({ ...showing, state: "active" });
      }),
      http.post(apiUrl(`${promotionsPath}/:id/unpublish`), ({ params }) => {
        calls.push({
          method: "POST",
          path: `${String(params.id)}/unpublish`,
          body: null,
        });
        return jsonResponse({ ...showing, state: "draft", publishedAt: null });
      }),
    );
  });

  it("opens a published Promotion pre-filled, with its current image, its position, and whether it shows today", async () => {
    const { panel } = await openEdit(showing.headline);

    expect(within(panel).getByText("Posición 1 en el carrusel")).toBeVisible();
    expect(within(panel).getByLabelText("Título")).toHaveValue(
      showing.headline,
    );
    expect(within(panel).getByLabelText("Descripción")).toHaveValue(
      showing.description,
    );
    expect(within(panel).getByLabelText("Fecha de inicio")).toHaveValue(
      showing.displayStartsOn,
    );
    expect(within(panel).getByLabelText("Fecha de fin")).toHaveValue(
      showing.displayEndsOn,
    );
    expect(
      within(panel).getByRole("img", { name: "Vista previa de la imagen" }),
    ).toHaveAttribute(
      "src",
      `${promotionsPath}/${showing.id}/image?variant=promotion_1440&asset=${showing.image?.imageAssetId}`,
    );
    expect(within(panel).getByText("Imagen actual · 1600 × 900")).toBeVisible();
    expect(
      within(panel).getByText(
        "Se está mostrando ahora: hoy está dentro del rango.",
      ),
    ).toBeVisible();
    expect(buttonNames(panel)).toEqual([
      "Cambiar imagen",
      "Quitar",
      "Guardar cambios",
      "Dejar de publicar",
      "Eliminar promoción",
    ]);
  });

  it("says when today is outside a published window", async () => {
    const { panel } = await openEdit(scheduled.headline);

    expect(
      within(panel).getByText(
        "Hoy está fuera del rango: se guarda pero no se muestra.",
      ),
    ).toBeVisible();
    expect(within(panel).getByText("Posición 2 en el carrusel")).toBeVisible();
  });

  it("saves a copy change on a published Promotion and keeps it published", async () => {
    const { panel, user } = await openEdit(showing.headline);

    await user.clear(within(panel).getByLabelText("Título"));
    await user.type(within(panel).getByLabelText("Título"), "Sala de Reformer");
    await user.click(
      within(panel).getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() =>
      expect(calls).toEqual([
        {
          method: "PUT",
          path: showing.id,
          body: {
            headline: "Sala de Reformer",
            description: showing.description,
            displayStartsOn: showing.displayStartsOn,
            displayEndsOn: showing.displayEndsOn,
            imageAssetId: showing.image?.imageAssetId,
          },
        },
      ]),
    );
    expect(
      await screen.findByText("Promoción «Sala de Reformer» guardada."),
    ).toBeVisible();
  });

  it("takes a published Promotion out of the carousel with Dejar de publicar", async () => {
    const { panel, user } = await openEdit(showing.headline);

    await user.click(
      within(panel).getByRole("button", { name: "Dejar de publicar" }),
    );

    await waitFor(() =>
      expect(calls).toEqual([
        { method: "POST", path: `${showing.id}/unpublish`, body: null },
      ]),
    );
    expect(
      await screen.findByText(
        "Promoción «Nueva sala de Reformer en Urubó» ya no se publica en la app.",
      ),
    ).toBeVisible();
  });

  it("warns that removing the image unpublishes, and saves the draft without it", async () => {
    const { panel, user } = await openEdit(showing.headline);

    await user.click(within(panel).getByRole("button", { name: "Quitar" }));

    expect(
      within(panel).getByText(
        "Sin imagen, la promoción deja de publicarse al guardar; publícala de nuevo cuando subas otra.",
      ),
    ).toBeVisible();
    expect(buttonNames(panel)).toEqual([
      "Sube una imagen",
      "Guardar borrador",
      "Publicar",
      "Eliminar promoción",
    ]);
    expect(
      within(panel).getByRole("button", { name: "Publicar" }),
    ).toBeDisabled();

    await user.click(
      within(panel).getByRole("button", { name: "Guardar borrador" }),
    );

    await waitFor(() =>
      expect(calls).toEqual([
        {
          method: "PUT",
          path: showing.id,
          body: expect.objectContaining({ imageAssetId: null }),
        },
      ]),
    );
    expect(
      await screen.findByText(
        "Promoción «Nueva sala de Reformer en Urubó» guardada como borrador.",
      ),
    ).toBeVisible();
  });

  it("warns that a replaced image unpublishes, and Publicar saves then publishes again", async () => {
    const { panel, user } = await openEdit(showing.headline);

    await user.click(
      within(panel).getByRole("button", { name: "Cambiar imagen" }),
    );
    await user.upload(
      within(panel).getByLabelText("Archivo de imagen"),
      imageFile("otra.png"),
    );

    expect(
      await within(panel).findByText("otra.png · 1600 × 900"),
    ).toBeVisible();
    expect(
      within(panel).getByText(
        "Al cambiar la imagen, la promoción deja de publicarse al guardar; publícala de nuevo cuando la nueva imagen esté lista.",
      ),
    ).toBeVisible();
    expect(
      within(panel).getByRole("button", { name: "Publicar" }),
    ).toBeEnabled();

    await user.click(within(panel).getByRole("button", { name: "Publicar" }));

    await waitFor(() =>
      expect(calls).toEqual([
        {
          method: "PUT",
          path: showing.id,
          body: expect.objectContaining({ imageAssetId: uploadedAssetId }),
        },
        { method: "POST", path: `${showing.id}/publish`, body: null },
      ]),
    );
    expect(
      await screen.findByText(
        "Promoción «Nueva sala de Reformer en Urubó» publicada.",
      ),
    ).toBeVisible();
  });

  it("shows the replaced image on the card once the list is read again, never the browser's copy of the old one", async () => {
    let reads = 0;
    server.use(
      promotionListHandler(() => {
        reads += 1;
        return jsonResponse(
          reads === 1
            ? [showing]
            : [
                {
                  ...showing,
                  image: {
                    ...showing.image!,
                    imageAssetId: uploadedAssetId,
                    width: 1600,
                    height: 900,
                  },
                },
              ],
        );
      }),
    );
    const { panel, user } = await openEdit(showing.headline);
    // The open panel hides the page from assistive technology.
    const before = within(
      screen.getByRole("article", { name: showing.headline, hidden: true }),
    ).getByRole("presentation", { hidden: true });
    expect(before).toHaveAttribute(
      "src",
      expect.stringContaining(showing.image!.imageAssetId),
    );

    await user.click(
      within(panel).getByRole("button", { name: "Cambiar imagen" }),
    );
    await user.upload(
      within(panel).getByLabelText("Archivo de imagen"),
      imageFile("otra.png"),
    );
    await within(panel).findByText("otra.png · 1600 × 900");
    await user.click(within(panel).getByRole("button", { name: "Publicar" }));

    await waitFor(() =>
      expect(
        within(
          screen.getByRole("article", { name: showing.headline }),
        ).getByRole("presentation"),
      ).toHaveAttribute("src", expect.stringContaining(uploadedAssetId)),
    );
  });

  it("offers Guardar borrador and Publicar on a draft, Publicar only once it has an image", async () => {
    const { panel, user } = await openEdit(horario.headline);
    expect(buttonNames(panel)).toEqual([
      "Sube una imagen",
      "Guardar borrador",
      "Publicar",
      "Eliminar promoción",
    ]);
    expect(
      within(panel).getByRole("button", { name: "Publicar" }),
    ).toBeDisabled();
    expect(
      within(panel).queryByText(
        /Se está mostrando ahora|Hoy está fuera del rango:/,
      ),
    ).not.toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(
      screen.getByRole("button", { name: draftWithImage.headline }),
    );
    const other = await screen.findByRole("dialog", {
      name: "Editar promoción",
    });
    expect(
      within(other).getByRole("button", { name: "Publicar" }),
    ).toBeEnabled();
    await user.click(within(other).getByRole("button", { name: "Publicar" }));

    await waitFor(() =>
      expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
        `PUT ${draftWithImage.id}`,
        `POST ${draftWithImage.id}/publish`,
      ]),
    );
  });

  it("explains a Promotion that was deleted meanwhile", async () => {
    server.use(
      http.put(apiUrl(`${promotionsPath}/:id`), () =>
        problemResponse(409, "promotion_archived"),
      ),
    );
    const { panel, user } = await openEdit(showing.headline);

    await user.click(
      within(panel).getByRole("button", { name: "Guardar cambios" }),
    );

    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "Esta promoción ya fue eliminada. Cierra el panel y vuelve a abrir la lista.",
    );
  });
});
