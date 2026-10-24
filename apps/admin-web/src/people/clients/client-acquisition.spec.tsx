import { screen, within } from "@testing-library/react";
import { http } from "msw";
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
  luciaAcquisition,
  luciaDetail,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const acquisitionPath = `${clientsPath}/${lucia.id}/acquisition`;
const corrections: unknown[] = [];

const openLucia = async () => {
  const rendered = renderAdmin("/back-office/clientes");
  await rendered.user.click(
    await screen.findByRole("button", { name: "Lucía Fernández" }),
  );
  const panel = await screen.findByRole("dialog", { name: "Lucía Fernández" });
  return {
    ...rendered,
    panel,
    block: await within(panel).findByRole("region", {
      name: "¿Cómo nos conociste?",
    }),
  };
};

// BKM-011 (follow-up 142): AW22 shows how the Client found the studio and
// lets the Administrator correct it.
describe("AW22 «¿Cómo nos conociste?»", () => {
  useMockServer();
  beforeEach(() => {
    corrections.length = 0;
    server.use(
      acquisitionHandler(),
      ...signedInHandlers(),
      http.get(apiUrl(clientsPath), () => jsonResponse(clientPage([lucia]))),
      http.get(apiUrl(`${clientsPath}/:clientId`), () =>
        jsonResponse(luciaDetail),
      ),
    );
  });

  it("names the channel, the code, and who brought her", async () => {
    const { block } = await openLucia();

    expect(within(block).getByText("Una instructora")).toBeInTheDocument();
    expect(within(block).getByText("EMMA")).toBeInTheDocument();
    expect(within(block).getByText("Emma Vargas")).toBeInTheDocument();
    expect(
      within(block).getByText("Ella respondió: Instagram"),
    ).toBeInTheDocument();
  });

  it("says when the Client registered before the question", async () => {
    server.use(
      acquisitionHandler({
        ...luciaAcquisition,
        channel: "unknown",
        declaredChannel: "unknown",
        referralCode: null,
        referrer: null,
      }),
    );
    const { block } = await openLucia();

    expect(within(block).getByText("Sin dato")).toBeInTheDocument();
    expect(within(block).queryByText("Código")).not.toBeInTheDocument();
  });

  it("corrects the channel and removes the code", async () => {
    server.use(
      http.put(apiUrl(acquisitionPath), async ({ request }) => {
        corrections.push(await request.json());
        return jsonResponse({
          ...luciaAcquisition,
          channel: "tiktok",
          declaredChannel: "tiktok",
          referralCode: null,
          referrer: null,
        });
      }),
    );
    const { block, user } = await openLucia();

    await user.click(within(block).getByRole("button", { name: "Corregir" }));
    await user.selectOptions(within(block).getByLabelText("Canal"), "TikTok");
    await user.clear(within(block).getByLabelText("Código (opcional)"));
    await user.click(within(block).getByRole("button", { name: "Guardar" }));

    expect(await within(block).findByText("TikTok")).toBeInTheDocument();
    expect(corrections).toEqual([{ channel: "tiktok", referralCode: null }]);
    expect(
      within(block).queryByRole("button", { name: "Guardar" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the form open on a code nobody holds", async () => {
    server.use(
      http.put(apiUrl(acquisitionPath), () =>
        problemResponse(400, "referral_code_invalid"),
      ),
    );
    const { block, user } = await openLucia();

    await user.click(within(block).getByRole("button", { name: "Corregir" }));
    const code = within(block).getByLabelText("Código (opcional)");
    await user.clear(code);
    await user.type(code, "NADIE");
    await user.click(within(block).getByRole("button", { name: "Guardar" }));

    expect(
      await within(block).findByText(
        "No encontramos ese código. Revísalo o déjalo vacío.",
      ),
    ).toBeInTheDocument();
    expect(code).toHaveValue("NADIE");
  });
});
