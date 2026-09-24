import { screen, within } from "@testing-library/react";
import {
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import {
  barre,
  horario,
  promotionList,
  promotionListHandler,
  promotionsPath,
  reformer,
  verano,
} from "../test/promotion-fixtures";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";

const card = async (headline: string) =>
  screen.findByRole("article", { name: headline });

describe("AW17 Promociones", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers()));

  it("lists every live Promotion as a card in carousel order with its thumbnail, window, state, and position", async () => {
    server.use(promotionList([reformer, barre, horario, verano]));
    renderAdmin("/promociones");

    expect(await screen.findByText("Cargando promociones…")).toBeVisible();
    const list = await screen.findByRole("list", {
      name: "Promociones en el orden del carrusel",
    });
    expect(
      within(list)
        .getAllByRole("article")
        .map((item) => item.getAttribute("aria-label")),
    ).toEqual([
      "Nueva sala de Reformer en Urubó",
      "Clases de Barre los sábados",
      "Horario de fin de año",
      "Semana de puertas abiertas",
    ]);
    expect(
      screen.getByText("4 promociones · arrastra para cambiar el orden"),
    ).toBeVisible();
    expect(
      screen.queryByText("Esta sección aún no está disponible."),
    ).not.toBeInTheDocument();

    const first = await card("Nueva sala de Reformer en Urubó");
    expect(within(first).getByRole("presentation")).toHaveAttribute(
      "src",
      `${promotionsPath}/${reformer.id}/image?variant=promotion_480`,
    );
    expect(
      within(first).getByText("Del 01/09/2026 al 31/10/2026"),
    ).toBeVisible();
    expect(within(first).getByText("Activa")).toBeVisible();
    expect(within(first).getByText("Posición 1")).toBeInTheDocument();
    expect(
      within(first).getByRole("button", {
        name: "Mover Nueva sala de Reformer en Urubó",
      }),
    ).toBeVisible();

    expect(
      within(await card("Clases de Barre los sábados")).getByText("Programada"),
    ).toBeVisible();
    const draft = await card("Horario de fin de año");
    expect(within(draft).getByText("Borrador")).toBeVisible();
    expect(within(draft).queryByRole("presentation")).not.toBeInTheDocument();
    expect(within(draft).getByText("Sin imagen")).toBeVisible();
    expect(within(draft).getByText("Posición 3")).toBeInTheDocument();
    expect(
      within(await card("Semana de puertas abiertas")).getByText("Finalizada"),
    ).toBeVisible();

    expect(
      screen.getByRole("button", { name: "Nueva promoción" }),
    ).toBeVisible();
    const sidebar = screen.getByRole("navigation", { name: "Secciones" });
    expect(
      within(sidebar).getByRole("link", { name: "Promociones" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("explains an empty carousel", async () => {
    server.use(promotionList([]));
    renderAdmin("/promociones");

    expect(
      await screen.findByText("Todavía no hay promociones."),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Crea la primera con «Nueva promoción»; las clientas la verán en el inicio de la app cuando la publiques.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Ninguna promoción en el carrusel")).toBeVisible();
  });

  it("shows a failed read with a retry that reads again", async () => {
    // A 4xx is not retried by the query itself (ADR-0021), so the failure
    // shows and only the button reads again.
    let attempts = 0;
    server.use(
      promotionListHandler(() => {
        attempts += 1;
        return attempts === 1
          ? problemResponse(404, "not_found")
          : jsonResponse([reformer]);
      }),
    );
    const { user } = renderAdmin("/promociones");

    expect(
      await screen.findByText("No pudimos cargar las promociones."),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await card("Nueva sala de Reformer en Urubó")).toBeVisible();
  });

  it("tells an Administrator who lost access that the page is not theirs", async () => {
    server.use(
      promotionListHandler(() =>
        problemResponse(403, "administration_access_denied"),
      ),
    );
    renderAdmin("/promociones");

    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Nueva promoción" }),
    ).not.toBeInTheDocument();
  });
});
