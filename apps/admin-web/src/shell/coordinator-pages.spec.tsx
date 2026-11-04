import { screen, within } from "@testing-library/react";
import { http } from "msw";
import {
  alcohol,
  branchSuppliesHandler,
  detergent,
  suppliesPath,
  supplyPage,
} from "../test/back-office-fixtures";
import { feedbackPage, feedbackPath, problem } from "../test/feedback-fixtures";
import { freezesPath } from "../test/home-handlers";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import { coordinatorHandlers } from "../test/session-handlers";
import {
  studioSettings,
  studioSettingsPath,
} from "../test/studio-settings-fixtures";

const freeze = {
  id: "freeze-1",
  clientName: "Valeria Quiroga",
  planName: "Paquete de 12 clases",
  startsOn: "2026-11-10",
  endsOn: "2026-11-24",
  reason: "Viaje",
  state: "requested",
};

const heading = (name: string | RegExp) =>
  screen.findByRole("heading", { level: 1, name });

// BKO-010 / ADR-0108 (follow-up 232): what the widened Coordinator sees on
// the pages she now opens, and what she still may not do there.
describe("the widened Coordinator", () => {
  useMockServer();
  beforeEach(() => server.use(...coordinatorHandlers()));

  it("counts the selected Branch's low stock on Estudio in the rail", async () => {
    server.use(branchSuppliesHandler([alcohol]));
    renderAdmin("/");
    await heading(/^Buen/);

    const rail = screen.getByRole("navigation", { name: "Secciones" });
    expect(
      await within(rail).findByRole("link", {
        name: "Estudio, 1 con stock bajo",
      }),
    ).toBeVisible();
  });

  it("lists freezes, new comments and low stock on Inicio, never payments", async () => {
    server.use(
      branchSuppliesHandler([alcohol]),
      http.get(apiUrl(freezesPath), () => jsonResponse([freeze])),
      http.get(apiUrl(feedbackPath), () =>
        jsonResponse(feedbackPage([problem])),
      ),
    );
    renderAdmin("/");

    const card = await screen.findByRole("region", { name: "Por resolver" });
    expect(await within(card).findByText("3 pendientes")).toBeVisible();
    expect(
      within(screen.getByRole("list", { name: "Pendientes" }))
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/clientas/congelamientos", "/comentarios", "/estudio/insumos"]);
    expect(screen.queryByText(/Bs/)).toBeNull();
  });

  it("records withdrawals and restocks on Insumos but never changes a Supply", async () => {
    server.use(
      http.get(apiUrl(suppliesPath), () =>
        jsonResponse(supplyPage([detergent])),
      ),
    );
    renderAdmin("/estudio/insumos");
    await heading("Insumos");

    expect(await screen.findByText("Detergente")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Registrar retiro" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Registrar reposición" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Nuevo insumo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Detergente" })).toBeNull();
  });

  it("reads Reglas del estudio without a form, a Guardar, or an amount", async () => {
    server.use(
      http.get(apiUrl(studioSettingsPath), () =>
        jsonResponse({
          ...studioSettings,
          evaluationPriceCentavos: null,
          nutritionistFeeCentavos: null,
        }),
      ),
    );
    renderAdmin("/ajustes/reglas-del-estudio");
    await heading("Reglas del estudio");

    expect(
      await screen.findByText("Mínimo de reservas por clase"),
    ).toBeVisible();
    expect(
      screen.getByText("Días adelante que una clienta puede reservar"),
    ).toBeVisible();
    expect(screen.getByText("7 días")).toBeVisible();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /Guardar/ })).toBeNull();
    expect(screen.queryByText("Evaluación nutricional pagada")).toBeNull();
    expect(screen.queryByText(/Bs/)).toBeNull();
  });
});
