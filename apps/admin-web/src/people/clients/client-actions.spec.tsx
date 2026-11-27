import type { AdminClientDetailDto } from "@pilates/api-contracts";
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
import {
  coordinatorHandlers,
  signedInHandlers,
} from "../../test/session-handlers";

const showing = (detail: AdminClientDetailDto) => [
  http.get(apiUrl(clientsPath), () => jsonResponse(clientPage([lucia]))),
  http.get(apiUrl(`${clientsPath}/:clientId`), () => jsonResponse(detail)),
  acquisitionHandler(),
];

const openLucia = async () => {
  const rendered = renderAdmin("/clientas");
  await rendered.user.click(
    await screen.findByRole("button", { name: "Lucía Fernández" }),
  );
  const panel = await screen.findByRole("dialog", { name: "Lucía Fernández" });
  await within(panel).findByText("Clienta desde vie 12 abr");
  return { ...rendered, panel };
};

const actionNames = (panel: HTMLElement) =>
  within(within(panel).getByRole("list", { name: "Acciones" }))
    .getAllByRole("button")
    .map((button) => button.textContent);

// FIX-091 W7 B: the file's actions sit together at the end of Resumen, one
// row each, and the footer keeps only «Editar perfil».
describe("W7 the Client file's actions at the end", () => {
  useMockServer();

  it("lists the Administrator's actions after the summary blocks", async () => {
    server.use(...signedInHandlers(), ...showing(luciaDetail));
    const { panel } = await openLucia();

    expect(actionNames(panel)).toEqual(["Devolver una clase", "Cerrar cuenta"]);
    const tabPanel = within(panel).getByRole("tabpanel");
    const actions = within(panel).getByRole("list", { name: "Acciones" });
    const referrals = within(panel).getByText("LUCIA25");
    expect(
      referrals.compareDocumentPosition(actions) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(tabPanel).toContainElement(actions);
    const footerButtons = within(panel)
      .getAllByRole("button")
      .filter((button) => !tabPanel.contains(button))
      .map((button) => button.textContent)
      .filter(
        (name) =>
          // The close icon has no text.
          name !== "" &&
          !["Resumen", "Reservas", "Pagos", "Evaluaciones"].includes(
            name ?? "",
          ),
      );
    expect(footerButtons).toEqual(["Editar perfil"]);
  });

  it("offers only closing the account without an active Plan", async () => {
    server.use(
      ...signedInHandlers(),
      ...showing({
        ...luciaDetail,
        subscription: { status: "none", subscription: null },
      }),
    );
    const { panel } = await openLucia();

    expect(actionNames(panel)).toEqual(["Cerrar cuenta"]);
  });

  it("shows the Coordinator no actions", async () => {
    server.use(...coordinatorHandlers(), ...showing(luciaDetail));
    const { panel } = await openLucia();

    expect(
      within(panel).queryByRole("list", { name: "Acciones" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Editar perfil" }),
    ).toBeVisible();
  });

  it("names the approved Freeze's days on the Plan", async () => {
    server.use(
      ...signedInHandlers(),
      ...showing({
        ...luciaDetail,
        subscription: {
          ...luciaDetail.subscription,
          freeze: {
            id: "f0000000-0000-5000-8000-000000000001",
            state: "approved",
            startsOn: "2026-09-20",
            endsOn: "2026-09-22",
          },
        },
      }),
    );
    const { panel } = await openLucia();

    const row = within(panel).getByText("Congelado").parentElement!;
    expect(row).toHaveTextContent("dom 20 al mar 22 sept");
  });
});
