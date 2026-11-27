import { type AdminClientDetailDto } from "@pilates/api-contracts";
import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import {
  acquisitionHandler,
  clientPage,
  clientsPath,
  lucia,
  luciaDetail,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const withoutPlan: AdminClientDetailDto = {
  ...luciaDetail,
  subscription: { status: "none", subscription: null },
};

// 2026-11-27 (owner decision): nobody grants the hidden «Plan de cortesía»
// any more, so a Client without a Plan is offered no tester access.
describe("no Acceso de prueba (courtesy grants removed)", () => {
  useMockServer();

  it("offers a Client without a Plan no tester access", async () => {
    server.use(
      ...signedInHandlers(),
      http.get(apiUrl(clientsPath), () => jsonResponse(clientPage([lucia]))),
      http.get(apiUrl(`${clientsPath}/:clientId`), () =>
        jsonResponse(withoutPlan),
      ),
      acquisitionHandler(),
    );
    const { user } = renderAdmin("/clientas");
    await user.click(
      await screen.findByRole("button", { name: "Lucía Fernández" }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Lucía Fernández",
    });

    expect(
      await within(panel).findByRole("button", { name: "Cerrar cuenta" }),
    ).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Acceso de prueba" }),
    ).not.toBeInTheDocument();
  });
});
