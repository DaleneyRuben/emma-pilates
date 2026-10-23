import type { AdminClientDetailDto } from "@pilates/api-contracts";
import { screen, within } from "@testing-library/react";
import { delay, http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import {
  acquisitionHandler,
  clientPage,
  clientsPath,
  lucia,
  luciaDetail,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";

const detailReads: string[] = [];
const handlers = (respond: () => Response) => [
  http.get(apiUrl(clientsPath), () => jsonResponse(clientPage([lucia]))),
  http.get(apiUrl(`${clientsPath}/:clientId`), ({ params }) => {
    detailReads.push(String(params.clientId));
    return respond();
  }),
];

const openLucia = async () => {
  const rendered = renderAdmin("/back-office/clientes");
  await rendered.user.click(
    await screen.findByRole("button", { name: "Lucía Fernández" }),
  );
  return {
    ...rendered,
    panel: await screen.findByRole("dialog", { name: "Lucía Fernández" }),
  };
};

const withPlan = (
  subscription: AdminClientDetailDto["subscription"],
  extra: Partial<AdminClientDetailDto> = {},
): AdminClientDetailDto => ({ ...luciaDetail, subscription, ...extra });

describe("AW22 Detalle de cliente on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    detailReads.length = 0;
    server.use(...signedInHandlers(), acquisitionHandler());
  });

  it("summarizes contact, the current Plan, Credit, and referrals read-only", async () => {
    server.use(...handlers(() => jsonResponse(luciaDetail)));
    const { panel } = await openLucia();

    expect(panel).toHaveAttribute("data-presentation", "side-panel");
    expect(
      await within(panel).findByText("Cliente desde 12/04/2024"),
    ).toBeInTheDocument();
    expect(within(panel).getByText("lucia@example.com")).toBeInTheDocument();
    expect(within(panel).getByText("+591 70011001")).toBeInTheDocument();
    expect(within(panel).getByText("Paquete de 8 clases")).toBeInTheDocument();
    expect(within(panel).getByText("Activo")).toBeInTheDocument();
    expect(
      within(panel).getByText("01/09/2026 – 30/09/2026"),
    ).toBeInTheDocument();
    expect(within(panel).getByText("5 de 8")).toBeInTheDocument();
    expect(within(panel).getByText("Bs 1.050,00")).toBeInTheDocument();
    expect(within(panel).getByText("3")).toBeInTheDocument();
    expect(within(panel).getByText("LUCIA25")).toBeInTheDocument();
    expect(within(panel).queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Guardar" }),
    ).not.toBeInTheDocument();
    expect(detailReads).toEqual([lucia.id]);
  });

  it("says it is loading while the summary is on its way", async () => {
    // The first matching handler of one server.use call answers.
    server.use(
      http.get(apiUrl(`${clientsPath}/:clientId`), async () => {
        await delay("infinite");
        return jsonResponse(luciaDetail);
      }),
      ...handlers(() => jsonResponse(luciaDetail)),
    );
    const { panel } = await openLucia();

    expect(within(panel).getByText("Cargando la ficha…")).toBeInTheDocument();
  });

  it("collapses the Plan to the last expiry when none is active", async () => {
    server.use(
      ...handlers(() =>
        jsonResponse(
          withPlan(
            {
              status: "expired",
              subscription: {
                ...luciaDetail.subscription.subscription!,
                remainingClassAllowance: 0,
                endsOn: "2026-06-30",
              },
            },
            { creditAvailableCentavos: 0, referredClientCount: 0, phone: null },
          ),
        ),
      ),
    );
    const { panel } = await openLucia();

    expect(await within(panel).findByText("Sin plan activo")).toBeVisible();
    expect(within(panel).getByText("Expirado")).toBeInTheDocument();
    expect(
      within(panel).getByText("Último plan vencido el 30/06/2026."),
    ).toBeInTheDocument();
    expect(within(panel).queryByText(/de 8/)).not.toBeInTheDocument();
    expect(within(panel).getByText("Bs 0,00")).toBeInTheDocument();
    expect(within(panel).getByText("Ninguna todavía")).toBeInTheDocument();
    expect(within(panel).getByText("Sin teléfono")).toBeInTheDocument();
  });

  it("says plainly when the Client never had a Plan", async () => {
    server.use(
      ...handlers(() =>
        jsonResponse(withPlan({ status: "none", subscription: null })),
      ),
    );
    const { panel } = await openLucia();

    expect(await within(panel).findByText("Sin plan activo")).toBeVisible();
    expect(within(panel).queryByText("Expirado")).not.toBeInTheDocument();
    expect(within(panel).queryByText(/Último plan/)).not.toBeInTheDocument();
  });

  it("shows a staff-created Account still waiting for activation", async () => {
    server.use(
      ...handlers(() =>
        jsonResponse(
          withPlan(luciaDetail.subscription, { accountStatus: "pending" }),
        ),
      ),
    );
    const { panel } = await openLucia();

    expect(
      await within(panel).findByText("Pendiente de activación"),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(
        "Todavía no abrió el enlace del correo para crear su contraseña.",
      ),
    ).toBeInTheDocument();
  });

  it("offers no «Cerrar cuenta» on a deactivated account (AW22)", async () => {
    server.use(
      ...handlers(() =>
        jsonResponse(
          withPlan(luciaDetail.subscription, { accountStatus: "disabled" }),
        ),
      ),
    );
    const { panel } = await openLucia();

    expect(
      await within(panel).findByText("Cuenta desactivada"),
    ).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Cerrar cuenta" }),
    ).not.toBeInTheDocument();
  });

  it("says when the Client no longer exists and when the summary cannot load", async () => {
    server.use(...handlers(() => problemResponse(404, "client_not_found")));
    const { panel, user } = await openLucia();
    expect(
      await within(panel).findByText("Esta clienta ya no existe."),
    ).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Cerrar" }));
    server.use(...handlers(() => problemResponse(500, "unexpected_error")));
    await user.click(screen.getByRole("button", { name: "Lucía Fernández" }));
    const again = await screen.findByRole("dialog", {
      name: "Lucía Fernández",
    });
    expect(
      await within(again).findByText(
        "No pudimos cargar la ficha de la clienta.",
        {},
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
    expect(
      within(again).getByRole("button", { name: "Reintentar" }),
    ).toBeEnabled();
  });
});

describe("AW22 Detalle de cliente on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers(), acquisitionHandler()));

  it("fills the screen with the same summary", async () => {
    server.use(...handlers(() => jsonResponse(luciaDetail)));
    const { panel } = await openLucia();

    expect(panel).toHaveAttribute("data-presentation", "full-screen");
    expect(await within(panel).findByText("5 de 8")).toBeInTheDocument();
  });
});
