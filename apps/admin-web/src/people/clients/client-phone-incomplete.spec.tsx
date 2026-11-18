import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import {
  acquisitionHandler,
  clientPage,
  clientRow,
  clientsPath,
  luciaDetail,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

// Walkthrough finding 74 (FIX-063): a Client registered before the phone was
// required may have none, or digits without a country code. The web says
// «Celular incompleto» instead of the raw value, and «Sin teléfono» when none
// is stored (finding 114, FIX-080).
const sofia = clientRow("Sofia Paredes", { phone: "7000004" });
const mariana = clientRow("Mariana Quiroga", { phone: null });
const lucia = clientRow("Lucía Fernández", {
  id: "c1000000-0000-5000-8000-000000000074",
  phone: "+51 912345678",
});

const rowOf = async (name: string) =>
  (await screen.findByRole("cell", { name: new RegExp(name) }))
    .parentElement as HTMLElement;

describe("AW21/AW22 an incomplete phone", () => {
  useMockServer();
  beforeEach(() => {
    server.use(
      ...signedInHandlers(),
      acquisitionHandler(),
      http.get(apiUrl(clientsPath), () =>
        jsonResponse(clientPage([sofia, mariana, lucia])),
      ),
    );
  });

  it("marks it «Celular incompleto» in the Clientes list", async () => {
    renderAdmin("/clientas");

    const sofiaRow = await rowOf("Sofia Paredes");
    expect(within(sofiaRow).getByText("Celular incompleto")).toBeVisible();
    expect(within(sofiaRow).queryByText(/7000004/)).not.toBeInTheDocument();
    const marianaRow = await rowOf("Mariana Quiroga");
    expect(within(marianaRow).getByText("Sin teléfono")).toBeVisible();
    expect(
      within(marianaRow).queryByText("Celular incompleto"),
    ).not.toBeInTheDocument();
    const luciaRow = await rowOf("Lucía Fernández");
    expect(within(luciaRow).getByText("🇵🇪 +51 912345678")).toBeVisible();
    expect(
      within(luciaRow).queryByText("Celular incompleto"),
    ).not.toBeInTheDocument();
  });

  it("marks it «Celular incompleto» on Sofia Paredes's file", async () => {
    server.use(
      http.get(apiUrl(`${clientsPath}/:clientId`), () =>
        jsonResponse({ ...luciaDetail, name: "Sofia Paredes", phone: "7000004" }),
      ),
    );
    const { user } = renderAdmin("/clientas");
    await user.click(await screen.findByRole("button", { name: "Sofia Paredes" }));
    const panel = await screen.findByRole("dialog", { name: "Sofia Paredes" });

    expect(await within(panel).findByText("Celular incompleto")).toBeVisible();
    expect(within(panel).queryByText("Sin teléfono")).not.toBeInTheDocument();
    expect(within(panel).queryByText(/7000004/)).not.toBeInTheDocument();
  });

  it("says «Sin teléfono» on Mariana Quiroga's file, who has none", async () => {
    server.use(
      http.get(apiUrl(`${clientsPath}/:clientId`), () =>
        jsonResponse({ ...luciaDetail, name: "Mariana Quiroga", phone: null }),
      ),
    );
    const { user } = renderAdmin("/clientas");
    await user.click(
      await screen.findByRole("button", { name: "Mariana Quiroga" }),
    );
    const panel = await screen.findByRole("dialog", { name: "Mariana Quiroga" });

    expect(await within(panel).findByText("Sin teléfono")).toBeVisible();
    expect(
      within(panel).queryByText("Celular incompleto"),
    ).not.toBeInTheDocument();
  });
});
