import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import {
  horario,
  promotionListHandler,
  promotionRow,
  promotionsPath,
  reformer,
} from "../test/promotion-fixtures";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";
import { useNarrowViewport } from "../test/viewport";

type Sent = { key: string | null; body: unknown };

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
  await user.type(
    within(panel).getByLabelText("Título"),
    "Horario de fin de año",
  );
  await user.type(
    within(panel).getByLabelText("Descripción"),
    "Del 22 de diciembre al 2 de enero abrimos solo por la mañana.",
  );
  await user.type(
    within(panel).getByLabelText("Fecha de inicio"),
    "2026-12-15",
  );
  await user.type(within(panel).getByLabelText("Fecha de fin"), "2027-01-02");
};

describe("AW18 Nueva promoción (follow-up 39)", () => {
  useMockServer();
  let listReads = 0;
  beforeEach(() => {
    listReads = 0;
    server.use(
      ...signedInHandlers(),
      promotionListHandler(() => {
        listReads += 1;
        return jsonResponse(listReads === 1 ? [reformer] : [reformer, horario]);
      }),
    );
  });

  it("opens the image-first form and keeps Publicar disabled until everything is there", async () => {
    const { panel } = await openCreate();

    expect(panel).toHaveAttribute("data-presentation", "side-panel");
    expect(
      within(panel).getByText("Entrará al final del carrusel"),
    ).toBeVisible();
    const controls = within(panel)
      .getAllByRole("button")
      .map((button) => button.textContent?.trim() ?? "");
    expect(controls).toEqual([
      "Sube una imagen",
      "Guardar borrador",
      "Publicar",
      "", // the panel's close icon
    ]);
    expect(
      within(panel).getByRole("button", { name: /Sube una imagen/ }),
    ).toHaveTextContent(
      "Arrastra el archivo o haz clic · JPG, PNG o WEBP horizontal, mínimo 1200 × 675 px",
    );
    expect(within(panel).getByLabelText("Título")).toHaveAttribute(
      "maxlength",
      "80",
    );
    expect(within(panel).getByLabelText("Descripción")).toHaveAttribute(
      "maxlength",
      "280",
    );
    expect(
      within(panel).getByText(
        "Entre esas dos fechas la promoción aparece en el inicio de la app; fuera del rango se guarda pero no se muestra.",
      ),
    ).toBeVisible();
    expect(
      within(panel).getByRole("button", { name: "Publicar" }),
    ).toBeDisabled();
    expect(
      within(panel).getByRole("button", { name: "Guardar borrador" }),
    ).toBeEnabled();
  });

  it("marks every empty field and an end date before the start", async () => {
    const { panel, user } = await openCreate();

    await user.click(
      within(panel).getByRole("button", { name: "Guardar borrador" }),
    );

    expect(within(panel).getByLabelText("Título")).toHaveAccessibleDescription(
      "Escribe el título.",
    );
    expect(
      within(panel).getByLabelText("Descripción"),
    ).toHaveAccessibleDescription("Escribe la descripción.");
    expect(
      within(panel).getByLabelText("Fecha de inicio"),
    ).toHaveAccessibleDescription("Elige la fecha de inicio.");
    expect(
      within(panel).getByLabelText("Fecha de fin"),
    ).toHaveAccessibleDescription(
      expect.stringContaining("Elige la fecha de fin."),
    );

    await fillCopy(user, panel);
    await user.clear(within(panel).getByLabelText("Fecha de fin"));
    await user.type(within(panel).getByLabelText("Fecha de fin"), "2026-12-01");
    await user.click(
      within(panel).getByRole("button", { name: "Guardar borrador" }),
    );

    expect(
      within(panel).getByLabelText("Fecha de fin"),
    ).toHaveAccessibleDescription(
      expect.stringContaining(
        "La fecha de fin no puede ser anterior a la de inicio.",
      ),
    );
  });

  it("saves a draft without an image under one Idempotency-Key, which a retry of the same draft reuses", async () => {
    const sent: Sent[] = [];
    server.use(
      http.post(apiUrl(promotionsPath), async ({ request }) => {
        sent.push({
          key: request.headers.get("idempotency-key"),
          body: await request.json(),
        });
        return sent.length === 1
          ? problemResponse(503, "unexpected_error")
          : jsonResponse(horario, 201);
      }),
    );
    const { panel, user } = await openCreate();
    await fillCopy(user, panel);

    await user.click(
      within(panel).getByRole("button", { name: "Guardar borrador" }),
    );
    expect(
      await within(panel).findByText("No pudimos guardar. Inténtalo de nuevo."),
    ).toBeVisible();

    await user.click(
      within(panel).getByRole("button", { name: "Guardar borrador" }),
    );

    await waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[0]?.body).toEqual({
      headline: "Horario de fin de año",
      description:
        "Del 22 de diciembre al 2 de enero abrimos solo por la mañana.",
      displayStartsOn: "2026-12-15",
      displayEndsOn: "2027-01-02",
      imageAssetId: null,
    });
    expect(sent[0]?.key).toMatch(/^[0-9a-f-]{36}$/);
    expect(sent[1]).toEqual(sent[0]);
    await waitFor(() => expect(panel).not.toBeInTheDocument());
    expect(
      screen.getByText(
        "Promoción «Horario de fin de año» guardada como borrador.",
      ),
    ).toBeVisible();
    expect(
      await screen.findByRole("article", { name: horario.headline }),
    ).toBeVisible();
  });

  it.each([
    [
      "idempotency_key_reused",
      409,
      "Ya guardamos esta promoción con otros datos. Cierra el panel y vuelve a abrir la lista.",
    ],
    [
      "invalid_promotion_value",
      400,
      "Revisa los datos: hay un valor que no es válido.",
    ],
    [
      "administration_access_denied",
      403,
      "No tienes permiso para cambiar las promociones.",
    ],
  ])(
    "explains a %s refusal inside the panel",
    async (code, status, message) => {
      server.use(
        http.post(apiUrl(promotionsPath), () => problemResponse(status, code)),
      );
      const { panel, user } = await openCreate();
      await fillCopy(user, panel);

      await user.click(
        within(panel).getByRole("button", { name: "Guardar borrador" }),
      );

      expect(await within(panel).findByRole("alert")).toHaveTextContent(
        message,
      );
      expect(panel).toBeInTheDocument();
    },
  );

  it("keeps the typed title at 80 characters", async () => {
    const { panel, user } = await openCreate();

    await user.type(within(panel).getByLabelText("Título"), "x".repeat(85));

    expect(within(panel).getByLabelText("Título")).toHaveValue("x".repeat(80));
  });
});

describe("AW18 Nueva promoción on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() =>
    server.use(
      ...signedInHandlers(),
      promotionListHandler(() => jsonResponse([reformer])),
      http.post(apiUrl(promotionsPath), () =>
        jsonResponse(promotionRow("09", "Horario de fin de año"), 201),
      ),
    ),
  );

  it("opens the form as a full-screen sheet with the dates stacked", async () => {
    const { panel } = await openCreate();

    expect(panel).toHaveAttribute("data-presentation", "full-screen");
    expect(within(panel).getByLabelText("Fecha de inicio")).toBeVisible();
    expect(within(panel).getByLabelText("Fecha de fin")).toBeVisible();
  });
});
