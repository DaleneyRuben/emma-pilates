import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";
import {
  studioSettings,
  studioSettingsPath,
} from "../test/studio-settings-fixtures";

const saved: unknown[] = [];
let current = { ...studioSettings };

const settingsHandlers = (
  save: (body: Record<string, unknown>) => Response = (body) => {
    current = {
      ...current,
      ...(body as Partial<typeof studioSettings>),
      version: current.version + 1,
      updatedAt: "2026-10-24T13:00:00.000Z",
    };
    return jsonResponse(current);
  },
) => [
  http.get(apiUrl(studioSettingsPath), () => jsonResponse(current)),
  http.put(apiUrl(studioSettingsPath), async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    saved.push(body);
    return save(body);
  }),
];

const heading = () =>
  screen.findByRole("heading", { level: 1, name: "Reglas del estudio" });

describe("AW36 Reglas del estudio", () => {
  useMockServer();
  beforeEach(() => {
    saved.length = 0;
    current = { ...studioSettings };
    server.use(...signedInHandlers());
  });

  it("opens from the account menu", async () => {
    server.use(...settingsHandlers());
    const { user } = renderAdmin("/");

    await user.click(
      await screen.findByRole("button", { name: "Tu cuenta: Paola Mendoza" }),
    );
    await user.click(
      await screen.findByRole("link", { name: "Reglas del estudio" }),
    );

    await heading();
    expect(document.title).toBe("Reglas del estudio · Emma");
  });

  it("shows the editable values and the fixed rules", async () => {
    server.use(...settingsHandlers());
    renderAdmin("/reglas-del-estudio");
    await heading();

    expect(
      await screen.findByLabelText("Mínimo de reservas por clase"),
    ).toHaveValue("2");
    expect(screen.getByLabelText("Impuestos sobre las ventas (%)")).toHaveValue(
      "16",
    );
    expect(screen.getByLabelText("Meses 1 a 6 (%)")).toHaveValue("80");
    expect(screen.getByLabelText("Meses 7 a 12 (%)")).toHaveValue("85");
    expect(screen.getByLabelText("Desde el mes 13 (%)")).toHaveValue("90");
    expect(screen.getByLabelText("Fecha de apertura")).toHaveValue("");

    const fixed = screen.getByRole("region", { name: "Reglas fijas" });
    expect(
      within(fixed).getByText("2 h 30 antes de cada clase"),
    ).toBeInTheDocument();
    expect(within(fixed).getByText("3 h antes de cada clase")).toBeVisible();
    expect(
      within(fixed).getByText("Hasta 14 días después de la compra"),
    ).toBeVisible();
    expect(
      within(fixed).getByText(
        "40 lugares · 15 % de descuento · se pierde con más de 7 días sin plan",
      ),
    ).toBeVisible();
    expect(
      within(fixed).getByText("Bs 70 · Bs 50 para la nutricionista"),
    ).toBeVisible();
    expect(
      screen.getByText("Versión 3 · guardada el 23/10/2026 por Paola Mendoza"),
    ).toBeVisible();
  });

  it("saves the changed values against the version it read", async () => {
    server.use(...settingsHandlers());
    const { user } = renderAdmin("/reglas-del-estudio");
    await heading();

    const minimum = await screen.findByLabelText(
      "Mínimo de reservas por clase",
    );
    await user.clear(minimum);
    await user.type(minimum, "3");
    await user.type(screen.getByLabelText("Fecha de apertura"), "2026-12-01");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("Guardamos las reglas del estudio."),
    ).toBeVisible();
    expect(saved).toEqual([
      {
        expectedVersion: 3,
        minimumBookings: 3,
        taxRatePercent: 16,
        renewalTargetMonths1To6Percent: 80,
        renewalTargetMonths7To12Percent: 85,
        renewalTargetFromMonth13Percent: 90,
        openingDate: "2026-12-01",
      },
    ]);
    expect(await screen.findByText(/^Versión 4 ·/)).toBeVisible();
  });

  it("refuses values out of range before sending", async () => {
    server.use(...settingsHandlers());
    const { user } = renderAdmin("/reglas-del-estudio");
    await heading();

    const minimum = await screen.findByLabelText(
      "Mínimo de reservas por clase",
    );
    await user.clear(minimum);
    await user.type(minimum, "0");
    const tax = screen.getByLabelText("Impuestos sobre las ventas (%)");
    await user.clear(tax);
    await user.type(tax, "120");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Entre 1 y 20 reservas.")).toBeVisible();
    expect(screen.getByText("Un porcentaje entre 0 y 100.")).toBeVisible();
    expect(saved).toEqual([]);
  });

  it("reloads the current values when someone saved first", async () => {
    server.use(
      ...settingsHandlers(() => {
        current = { ...current, version: 4, taxRatePercent: 13 };
        return problemResponse(409, "studio_settings_version_conflict");
      }),
    );
    const { user } = renderAdmin("/reglas-del-estudio");
    await heading();

    const minimum = await screen.findByLabelText(
      "Mínimo de reservas por clase",
    );
    await user.clear(minimum);
    await user.type(minimum, "3");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText(
        "Alguien guardó otras reglas mientras editabas. Te mostramos las actuales: revisa y vuelve a guardar.",
      ),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        screen.getByLabelText("Impuestos sobre las ventas (%)"),
      ).toHaveValue("13"),
    );
  });

  it("tells another Role it may not see the rules", async () => {
    server.use(
      http.get(apiUrl(studioSettingsPath), () =>
        problemResponse(403, "administration_access_denied"),
      ),
    );
    renderAdmin("/reglas-del-estudio");
    await heading();

    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Guardar cambios" }),
    ).not.toBeInTheDocument();
  });
});
