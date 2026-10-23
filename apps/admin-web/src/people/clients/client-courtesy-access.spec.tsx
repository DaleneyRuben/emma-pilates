import type { AdminClientDetailDto } from "@pilates/api-contracts";
import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { addDays, boliviaToday, formatCivilDate } from "../../lib/bolivia-time";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import {
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

type Grant = { body: unknown; key: string | null };
const grants: Grant[] = [];
let detail: AdminClientDetailDto = withoutPlan;

const handlers = (answer: (endsOn: string) => Response) => [
  http.get(apiUrl(clientsPath), () => jsonResponse(clientPage([lucia]))),
  http.get(apiUrl(`${clientsPath}/:clientId`), () => jsonResponse(detail)),
  http.post(
    apiUrl(`${clientsPath}/:clientId/courtesy-access`),
    async ({ request }) => {
      const body = (await request.json()) as { endsOn: string };
      grants.push({ body, key: request.headers.get("idempotency-key") });
      return answer(body.endsOn);
    },
  ),
];

const granted = (endsOn: string) => {
  detail = {
    ...withoutPlan,
    subscription: {
      status: "active",
      subscription: {
        id: "5b000000-0000-5000-8000-000000000009",
        planName: "Acceso de prueba",
        originalClassAllowance: 16,
        remainingClassAllowance: 16,
        startsOn: boliviaToday(),
        endsOn,
      },
    },
  };
  return jsonResponse({ id: "5c000000-0000-5000-8000-000000000009" }, 201);
};

const openPanel = async () => {
  const rendered = renderAdmin("/back-office/clientes");
  await rendered.user.click(
    await screen.findByRole("button", { name: "Lucía Fernández" }),
  );
  const panel = await screen.findByRole("dialog", { name: "Lucía Fernández" });
  return { ...rendered, panel };
};

const openDialog = async () => {
  const rendered = await openPanel();
  await rendered.user.click(
    await within(rendered.panel).findByRole("button", {
      name: "Acceso de prueba",
    }),
  );
  return {
    ...rendered,
    dialog: await screen.findByRole("alertdialog", {
      name: "¿Dar acceso de prueba a Lucía Fernández?",
    }),
  };
};

describe("AW22 Acceso de prueba (REL-011)", () => {
  useMockServer();
  beforeEach(() => {
    grants.length = 0;
    detail = withoutPlan;
    server.use(...signedInHandlers());
  });

  it("is offered only to a Client without an active Plan", async () => {
    detail = luciaDetail;
    server.use(...handlers(granted));
    const { panel } = await openPanel();

    expect(
      await within(panel).findByRole("button", { name: "Cerrar cuenta" }),
    ).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Acceso de prueba" }),
    ).not.toBeInTheDocument();
  });

  it("explains the grant and proposes thirty days from today", async () => {
    server.use(...handlers(granted));
    const { dialog } = await openDialog();

    expect(
      within(dialog).getByText(
        "Recibe el plan «Acceso de prueba»: 16 clases sin costo, desde hoy hasta la fecha que elijas. Es para las testers de la prueba cerrada y las cuentas de revisión de las tiendas; no cuenta como ingreso.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Válido hasta")).toHaveValue(
      addDays(boliviaToday(), 30),
    );
    expect(grants).toEqual([]);
  });

  it("grants access once, shows the new Plan, and says until when", async () => {
    server.use(...handlers(granted));
    const { dialog, panel, user } = await openDialog();
    const endsOn = addDays(boliviaToday(), 30);

    await user.click(
      within(dialog).getByRole("button", { name: "Dar acceso" }),
    );

    expect(
      await within(panel).findByText(
        `Acceso de prueba activo hasta el ${formatCivilDate(endsOn)}.`,
      ),
    ).toBeInTheDocument();
    expect(grants).toEqual([
      { body: { endsOn }, key: expect.stringMatching(/^[0-9a-f-]{36}$/) },
    ]);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(await within(panel).findByText("16 de 16")).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Acceso de prueba" }),
    ).not.toBeInTheDocument();
  });

  it("refuses an empty date before asking the API", async () => {
    server.use(...handlers(granted));
    const { dialog, user } = await openDialog();

    await user.clear(within(dialog).getByLabelText("Válido hasta"));

    expect(
      within(dialog).getByRole("button", { name: "Dar acceso" }),
    ).toBeDisabled();
  });

  it.each([
    [
      "subscription_not_expired",
      "Ya tiene un plan en uso. Puedes darle acceso de prueba cuando termine.",
    ],
    [
      "purchase_intent_open_exists",
      "Tiene una compra por transferencia sin terminar. Vuelve a intentarlo cuando venza.",
    ],
    [
      "courtesy_end_date_invalid",
      "Elige una fecha entre hoy y un año desde hoy.",
    ],
  ])("keeps the dialog open when the API answers %s", async (code, notice) => {
    server.use(...handlers(() => problemResponse(409, code)));
    const { dialog, user } = await openDialog();

    await user.click(
      within(dialog).getByRole("button", { name: "Dar acceso" }),
    );

    expect(await within(dialog).findByText(notice)).toBeInTheDocument();
  });

  it("points to Pagos while a transfer awaits review", async () => {
    server.use(
      ...handlers(() => problemResponse(409, "payment_pending_exists")),
    );
    const { dialog, user } = await openDialog();

    await user.click(
      within(dialog).getByRole("button", { name: "Dar acceso" }),
    );

    expect(
      await within(dialog).findByText(
        "Tiene un pago por transferencia en revisión. Confírmalo o recházalo en Pagos y vuelve a intentarlo.",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: "Ir a Pagos" }),
    ).toHaveAttribute("href", "/back-office/pagos");
  });

  it("explains a failure and lets the Administrator try again with the same key", async () => {
    server.use(...handlers(() => problemResponse(500, "unexpected_error")));
    const { dialog, user } = await openDialog();

    await user.click(
      within(dialog).getByRole("button", { name: "Dar acceso" }),
    );
    expect(
      await within(dialog).findByText(
        "No pudimos dar el acceso. Inténtalo de nuevo.",
      ),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Dar acceso" }),
    );

    await within(dialog).findByText(
      "No pudimos dar el acceso. Inténtalo de nuevo.",
    );
    expect(grants).toHaveLength(2);
    expect(grants[1].key).toBe(grants[0].key);
  });
});
