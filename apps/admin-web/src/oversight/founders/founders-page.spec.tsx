import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";

const foundersPath = "/api/v1/administrator/founder-memberships";

const page = {
  granted: 2,
  places: 40,
  items: [
    {
      membershipId: "founder-1",
      number: 1,
      clientName: "Lucía Fernández",
      since: "2026-10-02",
      status: "active",
    },
    {
      membershipId: "founder-2",
      number: 2,
      clientName: "Ana Rojas",
      since: "2026-10-03",
      status: "lost",
    },
  ],
};

describe("AW37 Fundadoras", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers()));

  it("lists number, name, since, and status with no create action", async () => {
    server.use(http.get(apiUrl(foundersPath), () => jsonResponse(page)));
    renderAdmin("/back-office/fundadoras");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Fundadoras" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("2 de 40 lugares")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nuevo/ })).toBeNull();

    const row = screen.getByRole("cell", { name: "Lucía Fernández" })
      .parentElement as HTMLElement;
    expect(within(row).getByRole("cell", { name: "1" })).toBeInTheDocument();
    expect(
      within(row).getByRole("cell", { name: "02/10/2026" }),
    ).toBeInTheDocument();
    expect(within(row).getByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("Perdida")).toBeInTheDocument();
  });

  it("says there are no founders yet", async () => {
    server.use(
      http.get(apiUrl(foundersPath), () =>
        jsonResponse({ items: [], granted: 0, places: 40 }),
      ),
    );
    renderAdmin("/back-office/fundadoras");

    expect(
      await screen.findByText("Todavía no hay fundadoras."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("El lugar se otorga al confirmarse el primer pago real."),
    ).toBeInTheDocument();
  });
});

describe("AW37 Fundadoras on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("keeps the number and the name on the card", async () => {
    server.use(http.get(apiUrl(foundersPath), () => jsonResponse(page)));
    renderAdmin("/back-office/fundadoras");

    expect(await screen.findByText("Lucía Fernández")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
  });
});
