import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { imageFile, useImageDimensions } from "../test/image-stubs";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import {
  promotionList,
  promotionRow,
  promotionsPath,
  reformer,
} from "../test/promotion-fixtures";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";
import {
  uploadedAssetId,
  uploadHandlers,
  type UploadSeen,
} from "../test/upload-fixtures";

const openCreate = async () => {
  const rendered = renderAdmin("/promociones");
  await screen.findByRole("article", { name: reformer.headline });
  await rendered.user.click(
    screen.getByRole("button", { name: "Nueva promoción" }),
  );
  const panel = await screen.findByRole("dialog", { name: "Nueva promoción" });
  return { ...rendered, panel };
};

const fillCopy = async (
  user: ReturnType<typeof renderAdmin>["user"],
  panel: HTMLElement,
) => {
  await user.type(within(panel).getByLabelText("Título"), "Sala nueva");
  await user.type(
    within(panel).getByLabelText("Descripción"),
    "Estrenamos sala de Reformer en Urubó.",
  );
  await user.type(
    within(panel).getByLabelText("Fecha de inicio"),
    "2026-10-01",
  );
  await user.type(within(panel).getByLabelText("Fecha de fin"), "2026-10-31");
};

const fileInput = (panel: HTMLElement) =>
  within(panel).getByLabelText("Archivo de imagen");

describe("AW18 image upload (follow-up 60, UPL-002)", () => {
  useMockServer();
  useImageDimensions({
    "portada.png": [1600, 900],
    "vertical.png": [1200, 1600],
    "ancha.jpg": [2400, 1000],
    "chica.png": [800, 450],
  });
  const seen: UploadSeen = { polls: 0 };
  beforeEach(() => {
    seen.polls = 0;
    seen.declared = undefined;
    server.use(...signedInHandlers(), promotionList([reformer]));
  });

  it("uploads a chosen image, previews it at 16:9 with its name and size, and lets Publicar create and publish", async () => {
    const posts: { path: string; body: unknown }[] = [];
    server.use(
      ...uploadHandlers(seen, ["processing", "ready"]),
      http.post(apiUrl(promotionsPath), async ({ request }) => {
        posts.push({ path: "create", body: await request.json() });
        return jsonResponse(promotionRow("07", "Sala nueva"), 201);
      }),
      http.post(apiUrl(`${promotionsPath}/:id/publish`), ({ params }) => {
        posts.push({ path: `publish ${String(params.id)}`, body: null });
        return jsonResponse(
          promotionRow("07", "Sala nueva", {
            state: "active",
            publishedAt: "2026-10-01T12:00:00.000Z",
          }),
        );
      }),
    );
    const { panel, user } = await openCreate();

    await user.upload(fileInput(panel), imageFile("portada.png"));

    expect(await within(panel).findByText("Subiendo la imagen…")).toBeVisible();
    const preview = await within(panel).findByRole("img", {
      name: "Vista previa de la imagen",
    });
    expect(preview).toHaveAttribute("src", expect.stringMatching(/^blob:/));
    expect(preview.closest("figure")).toHaveAttribute("data-crop", "none");
    expect(within(panel).getByText("portada.png · 1600 × 900")).toBeVisible();
    expect(
      within(panel).getByRole("button", { name: "Cambiar imagen" }),
    ).toBeVisible();
    expect(within(panel).getByRole("button", { name: "Quitar" })).toBeVisible();
    expect(
      within(panel).queryByRole("button", { name: "Sube una imagen" }),
    ).not.toBeInTheDocument();
    expect(seen.declared).toMatchObject({
      purpose: "promotion",
      mediaType: "image/png",
      byteSize: 8,
    });
    expect(seen.put).toEqual({ type: "image/png", byteLength: 8 });
    expect(seen.polls).toBe(2);
    expect(
      within(panel).getByRole("button", { name: "Publicar" }),
    ).toBeDisabled();

    await fillCopy(user, panel);
    expect(
      within(panel).getByRole("button", { name: "Publicar" }),
    ).toBeEnabled();
    await user.click(within(panel).getByRole("button", { name: "Publicar" }));

    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[0]).toEqual({
      path: "create",
      body: {
        headline: "Sala nueva",
        description: "Estrenamos sala de Reformer en Urubó.",
        displayStartsOn: "2026-10-01",
        displayEndsOn: "2026-10-31",
        imageAssetId: uploadedAssetId,
      },
    });
    expect(posts[1]?.path).toBe(
      `publish ${promotionRow("07", "Sala nueva").id}`,
    );
    expect(
      await screen.findByText("Promoción «Sala nueva» publicada."),
    ).toBeVisible();
  });

  it("dims the edges the 16:9 centre crop discards on a portrait or a very wide image", async () => {
    server.use(...uploadHandlers(seen));
    const { panel, user } = await openCreate();

    await user.upload(fileInput(panel), imageFile("vertical.png"));
    let preview = await within(panel).findByRole("img", {
      name: "Vista previa de la imagen",
    });
    expect(preview.closest("figure")).toHaveAttribute("data-crop", "ends");
    expect(
      within(panel).getByText(
        "Se recorta al centro en 16:9: se pierden los bordes superior e inferior.",
      ),
    ).toBeVisible();
    expect(within(panel).getByText("vertical.png · 1200 × 1600")).toBeVisible();

    await user.click(
      within(panel).getByRole("button", { name: "Cambiar imagen" }),
    );
    await user.upload(fileInput(panel), imageFile("ancha.jpg", "image/jpeg"));
    preview = await within(panel).findByRole("img", {
      name: "Vista previa de la imagen",
    });
    await waitFor(() =>
      expect(preview.closest("figure")).toHaveAttribute("data-crop", "sides"),
    );
    expect(
      within(panel).getByText(
        "Se recorta al centro en 16:9: se pierden los bordes laterales.",
      ),
    ).toBeVisible();
  });

  it("refuses a too-small image and a wrong format before any call, and keeps the drop target", async () => {
    server.use(...uploadHandlers(seen));
    const { panel, user } = await openCreate();

    await user.upload(fileInput(panel), imageFile("chica.png"));
    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "La imagen debe medir al menos 1200 × 675 píxeles.",
    );
    expect(
      within(panel).getByRole("button", { name: "Sube una imagen" }),
    ).toBeVisible();

    // The picker's `accept` keeps other formats out; a dropped file does not.
    fireEvent.drop(within(panel).getByTestId("promotion-drop-target"), {
      dataTransfer: {
        files: [
          new File([new Uint8Array([71, 73, 70])], "anim.gif", {
            type: "image/gif",
          }),
        ],
        types: ["Files"],
      },
    });
    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "Elige un archivo JPG, PNG o WEBP.",
    );
    expect(seen.declared).toBeUndefined();
  });

  it("says when the worker refuses the image and returns to the drop target", async () => {
    server.use(...uploadHandlers(seen, ["failed"]));
    const { panel, user } = await openCreate();

    await user.upload(fileInput(panel), imageFile("portada.png"));

    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "No pudimos procesar la imagen. Revisa que sea un JPG, PNG o WEBP de al menos 1200 × 675 píxeles y que no esté animada.",
    );
    expect(
      within(panel).getByRole("button", { name: "Sube una imagen" }),
    ).toBeVisible();
    expect(
      within(panel).queryByRole("img", { name: "Vista previa de la imagen" }),
    ).not.toBeInTheDocument();
  });

  it("accepts a file dropped on the target and forgets it with Quitar", async () => {
    server.use(...uploadHandlers(seen));
    const { panel, user } = await openCreate();

    fireEvent.drop(within(panel).getByTestId("promotion-drop-target"), {
      dataTransfer: { files: [imageFile("portada.png")], types: ["Files"] },
    });

    expect(
      await within(panel).findByRole("img", {
        name: "Vista previa de la imagen",
      }),
    ).toBeVisible();
    await fillCopy(user, panel);
    expect(
      within(panel).getByRole("button", { name: "Publicar" }),
    ).toBeEnabled();

    await user.click(within(panel).getByRole("button", { name: "Quitar" }));

    expect(
      within(panel).getByRole("button", { name: "Sube una imagen" }),
    ).toBeVisible();
    expect(
      within(panel).getByRole("button", { name: "Publicar" }),
    ).toBeDisabled();
  });
});
