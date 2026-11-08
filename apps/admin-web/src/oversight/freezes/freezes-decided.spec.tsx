import type { FreezeReviewDto } from "@pilates/api-contracts";
import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { freezesPath } from "../../test/home-handlers";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const decidedPath = `${freezesPath}/decided`;

const freeze = (
  id: string,
  clientName: string,
  extra: Partial<FreezeReviewDto> = {},
): FreezeReviewDto => ({
  id,
  clientName,
  clientPhoto: null,
  planName: "Paquete de 12 clases",
  startsOn: "2026-11-10",
  endsOn: "2026-11-16",
  reason: "Viaje",
  state: "requested",
  planEndsOn: "2027-02-05",
  planEndsOnAfter: "2027-02-12",
  decidedAt: null,
  decidedByName: null,
  ...extra,
});

const rowOf = async (name: string) =>
  (await screen.findByText(name)).closest("tr") as HTMLElement;

describe("Congelamientos: plan end and decided requests (findings 52/53)", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers()));

  it("shows a pending request's plan end change and its days", async () => {
    server.use(
      http.get(apiUrl(freezesPath), () =>
        jsonResponse([
          freeze("freeze-1", "Valeria Quiroga"),
          freeze("freeze-2", "Daniela Rojas", {
            planEndsOn: undefined,
            planEndsOnAfter: undefined,
          }),
        ]),
      ),
    );
    renderAdmin("/clientas/congelamientos");

    const row = await rowOf("Valeria Quiroga");
    expect(within(row).getByText("5 feb → 12 feb")).toBeInTheDocument();
    expect(within(row).getByText("7 días")).toBeInTheDocument();
    expect(
      within(row).getByRole("button", { name: "Aprobar" }),
    ).toBeInTheDocument();
    const older = await rowOf("Daniela Rojas");
    expect(within(older).getByText("—")).toBeInTheDocument();
  });

  it("switches to the decided requests, with result, plan end and decider", async () => {
    server.use(
      http.get(apiUrl(freezesPath), () => jsonResponse([])),
      http.get(apiUrl(decidedPath), () =>
        jsonResponse([
          freeze("freeze-3", "Valeria Quiroga", {
            state: "approved",
            decidedAt: "2026-11-08T14:15:00.000Z",
            decidedByName: "Paola Mendoza",
          }),
          freeze("freeze-4", "Daniela Rojas", {
            state: "refused",
            planEndsOnAfter: null,
            decidedAt: "2026-11-07T13:00:00.000Z",
            decidedByName: "Paola Mendoza",
          }),
        ]),
      ),
    );
    const { user } = renderAdmin("/clientas/congelamientos");
    expect(
      await screen.findByText("No hay solicitudes pendientes."),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Vista"), "Decididas");

    const approved = await rowOf("Valeria Quiroga");
    expect(within(approved).getByText("Aprobado")).toBeInTheDocument();
    expect(within(approved).getByText("7 días")).toBeInTheDocument();
    expect(
      within(approved).getByText("12 feb (antes 5 feb)"),
    ).toBeInTheDocument();
    expect(
      within(approved).getByText("Decidido por Paola Mendoza · 8 nov 10:15"),
    ).toBeInTheDocument();
    const refused = await rowOf("Daniela Rojas");
    expect(within(refused).getByText("Rechazado")).toBeInTheDocument();
    expect(within(refused).getByText("5 feb")).toBeInTheDocument();
    expect(
      within(refused).getByText("Decidido por Paola Mendoza · 7 nov 09:00"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Aprobar" }),
    ).not.toBeInTheDocument();
  });

  it("says so when nothing has been decided yet", async () => {
    server.use(
      http.get(apiUrl(freezesPath), () => jsonResponse([])),
      http.get(apiUrl(decidedPath), () => jsonResponse([])),
    );
    const { user } = renderAdmin("/clientas/congelamientos");
    await screen.findByText("No hay solicitudes pendientes.");

    await user.selectOptions(screen.getByLabelText("Vista"), "Decididas");

    expect(
      await screen.findByText("Todavía no hay congelamientos decididos."),
    ).toBeInTheDocument();
  });
});
