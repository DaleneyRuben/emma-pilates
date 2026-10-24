import { screen, within } from "@testing-library/react";
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

const kpisPath = "/api/v1/administrator/reports/kpis";
const narrativePath = "/api/v1/administrator/reports/narrative";
const questionsPath = "/api/v1/administrator/reports/narrative/questions";

const counts = {
  sessionsHeld: 2,
  occupancyPercent: 59,
  averageStudentsTimes10: 65,
  averageAttendanceTimes10: 55,
  noShowPercent: 15,
  activeClients: 2,
  newClients: 1,
  renewedClients: 1,
  renewalPercent: 50,
};

const amounts = {
  cashCentavos: 30_000,
  accruedCentavos: 12_000,
  deferredCentavos: 27_000,
  classesStillOwed: 5,
};

const months = (body: Record<string, unknown>) =>
  http.get(apiUrl(kpisPath), () => jsonResponse(body));

const narrative = {
  paragraphs: [
    "En octubre de 2026 se dictaron 20 clases, con una ocupación del 59 %. Había 8 clientas activas.",
    "La renovación del mes fue del 50 %.",
  ],
  actions: [
    {
      text: "Contacta a la clienta: tiene un plan vigente y no reservó este mes.",
      because:
        "Contacta a la clienta: tiene un plan vigente y no reservó este mes.",
    },
  ],
};

const narrativeHandlers = () => [
  http.get(apiUrl(narrativePath), () => jsonResponse(narrative)),
];

describe("AW39 Indicadores", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers());
  });

  it("shows the count tiles, the money figures, and a three-month chart for an Administrator", async () => {
    server.use(months({ month: "2026-10", ...counts, ...amounts }));
    renderAdmin("/reporte/indicadores");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Indicadores" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Indicadores" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const occupancy = await screen.findByRole("region", { name: "Ocupación" });
    expect(within(occupancy).getByText("59 %")).toBeVisible();
    expect(
      within(
        screen.getByRole("region", { name: "Alumnas por clase" }),
      ).getByText("6,5"),
    ).toBeVisible();
    expect(
      within(
        screen.getByRole("region", { name: "Clientas activas" }),
      ).getByText("2"),
    ).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Renovación" })).getByText(
        "50 %",
      ),
    ).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Cobrado" })).getByText(
        "Bs 300,00",
      ),
    ).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Devengado" })).getByText(
        "Bs 120,00",
      ),
    ).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Diferido" })).getByText(
        "Bs 270,00",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("figure", { name: "Clases dictadas" }),
    ).toBeVisible();
  });

  it("shows the month's report and answers a question for an Administrator", async () => {
    server.use(
      months({ month: "2026-10", ...counts, ...amounts }),
      ...narrativeHandlers(),
    );
    const { user } = renderAdmin("/reporte/indicadores");

    expect(
      await screen.findByRole("region", { name: "Informe del mes" }),
    ).toBeVisible();
    expect(
      screen.getByText(/se dictaron 20 clases, con una ocupación del 59 %/),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Contacta a la clienta: tiene un plan vigente y no reservó este mes.",
      ),
    ).toBeVisible();

    const asked: string[] = [];
    server.use(
      http.post(apiUrl(questionsPath), async ({ request }) => {
        asked.push(await request.text());
        return jsonResponse({
          refused: false,
          answer: "La ocupación del mes fue del 59 %.",
        });
      }),
    );
    await user.click(screen.getByRole("button", { name: "Preguntar" }));
    expect(asked).toEqual([]);

    await user.type(
      screen.getByLabelText("Pregunta sobre el mes"),
      "ocupación",
    );
    await user.click(screen.getByRole("button", { name: "Preguntar" }));
    expect(
      await screen.findByText("La ocupación del mes fue del 59 %."),
    ).toBeVisible();
    expect(asked).toHaveLength(1);
  });

  it("hides the report when the narrative answers 403 and keeps the count tiles", async () => {
    server.use(
      months({ month: "2026-10", ...counts }),
      http.get(apiUrl(narrativePath), () =>
        problemResponse(403, "studio_access_denied"),
      ),
    );
    renderAdmin("/reporte/indicadores");

    expect(
      await screen.findByRole("region", { name: "Ocupación" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("region", { name: "Informe del mes" }),
    ).toBeNull();
    expect(screen.queryByLabelText("Pregunta sobre el mes")).toBeNull();
  });

  it("shows the no-classes paragraph when the month held none", async () => {
    server.use(
      months({
        month: "2026-10",
        ...counts,
        ...amounts,
        sessionsHeld: 0,
        occupancyPercent: 0,
      }),
      http.get(apiUrl(narrativePath), () =>
        jsonResponse({
          paragraphs: ["En octubre de 2026 no se dictaron clases."],
          actions: [],
        }),
      ),
    );
    renderAdmin("/reporte/indicadores");

    expect(
      await screen.findByText("En octubre de 2026 no se dictaron clases."),
    ).toBeVisible();
    expect(screen.queryByRole("list", { name: "Acciones" })).toBeNull();
  });

  it("shows the report error and retries", async () => {
    let calls = 0;
    server.use(
      months({ month: "2026-10", ...counts, ...amounts }),
      http.get(apiUrl(narrativePath), () => {
        calls += 1;
        return calls === 1
          ? problemResponse(500, "no_se_pudo", { detail: "No se pudo" })
          : jsonResponse(narrative);
      }),
    );
    const { user } = renderAdmin("/reporte/indicadores");

    expect(
      await screen.findByText("No pudimos cargar el informe."),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(
      await screen.findByRole("region", { name: "Informe del mes" }),
    ).toBeVisible();
  });

  it("shows the loading notice while the report is pending", async () => {
    server.use(
      months({ month: "2026-10", ...counts, ...amounts }),
      http.get(apiUrl(narrativePath), () => new Promise(() => undefined)),
    );
    renderAdmin("/reporte/indicadores");

    expect(
      await screen.findByText("Cargando el informe…"),
    ).toBeVisible();
    expect(screen.getByRole("region", { name: "Ocupación" })).toBeVisible();
  });

  it("hides every money figure when the payload has no centavo keys", async () => {
    server.use(months({ month: "2026-10", ...counts }));
    renderAdmin("/reporte/indicadores");

    expect(
      await screen.findByRole("region", { name: "Ocupación" }),
    ).toBeVisible();
    expect(screen.queryByText(/Bs/)).toBeNull();
    expect(screen.queryByRole("region", { name: "Cobrado" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Devengado" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Diferido" })).toBeNull();
  });

  it("says the month had no classes and draws no chart when none were held", async () => {
    server.use(
      months({
        month: "2026-10",
        ...counts,
        sessionsHeld: 0,
        occupancyPercent: 0,
      }),
    );
    renderAdmin("/reporte/indicadores");

    expect(
      await screen.findByText("Sin clases dictadas en este mes."),
    ).toBeVisible();
    expect(
      screen.queryByRole("figure", { name: "Clases dictadas" }),
    ).toBeNull();
  });

  it("shows the error state and retries", async () => {
    server.use(
      http.get(apiUrl(kpisPath), () =>
        problemResponse(500, "no_se_pudo", { detail: "No se pudo" }),
      ),
    );
    renderAdmin("/reporte/indicadores");

    expect(
      await screen.findByText("No pudimos cargar los indicadores."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });
});
