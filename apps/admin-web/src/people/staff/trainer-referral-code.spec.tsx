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
  allBranchesHandler,
  camila,
  emma,
  referralCodeHandler,
  staffMembersPath,
  staffPage,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const codePath = `${staffMembersPath}/${emma.id}/referral-code`;
const saved: unknown[] = [];

const openMember = async (name: string) => {
  const rendered = renderAdmin("/back-office/personal");
  await rendered.user.click(await screen.findByRole("button", { name }));
  return {
    ...rendered,
    panel: await screen.findByRole("dialog", { name: "Editar miembro" }),
  };
};

// BKM-011 (follow-up 143): the Administrator gives each Trainer her code.
describe("AW24 «Código personal» of a Trainer", () => {
  useMockServer();
  beforeEach(() => {
    saved.length = 0;
    server.use(
      ...signedInHandlers(),
      allBranchesHandler(),
      http.get(apiUrl(staffMembersPath), () =>
        jsonResponse(staffPage([emma, camila])),
      ),
      referralCodeHandler(),
    );
  });

  it("saves a new code for a Trainer", async () => {
    server.use(
      http.put(apiUrl(codePath), async ({ request }) => {
        saved.push(await request.json());
        return jsonResponse({ staffMemberId: emma.id, referralCode: "EMMA" });
      }),
    );
    const { panel, user } = await openMember("Emma Vargas");
    const code = await within(panel).findByLabelText("Código personal");

    expect(code).toHaveValue("");
    await user.type(code, "emma");
    await user.click(
      within(panel).getByRole("button", { name: "Guardar código" }),
    );

    expect(
      await within(panel).findByText("Código guardado: EMMA."),
    ).toBeInTheDocument();
    expect(saved).toEqual([{ referralCode: "emma" }]);
    expect(code).toHaveValue("EMMA");
  });

  it("shows the current code and removes it when emptied", async () => {
    server.use(
      referralCodeHandler("EMMA"),
      http.put(apiUrl(codePath), async ({ request }) => {
        saved.push(await request.json());
        return jsonResponse({ staffMemberId: emma.id, referralCode: null });
      }),
    );
    const { panel, user } = await openMember("Emma Vargas");
    const code = await within(panel).findByLabelText("Código personal");

    expect(await within(panel).findByDisplayValue("EMMA")).toBe(code);
    await user.clear(code);
    await user.click(
      within(panel).getByRole("button", { name: "Guardar código" }),
    );

    expect(
      await within(panel).findByText("Quitamos el código."),
    ).toBeInTheDocument();
    expect(saved).toEqual([{ referralCode: null }]);
  });

  it.each([
    [
      "referral_code_in_use",
      409,
      "Ese código ya lo tiene otra clienta o instructora.",
    ],
    [
      "referral_code_malformed",
      400,
      "Usa de 3 a 20 letras, números o guiones, sin empezar con REF-.",
    ],
  ])("explains a refused code (%s)", async (code, status, message) => {
    server.use(http.put(apiUrl(codePath), () => problemResponse(status, code)));
    const { panel, user } = await openMember("Emma Vargas");

    await user.type(
      await within(panel).findByLabelText("Código personal"),
      "LUZ",
    );
    await user.click(
      within(panel).getByRole("button", { name: "Guardar código" }),
    );

    expect(await within(panel).findByText(message)).toBeInTheDocument();
  });

  it("offers no code to other Roles", async () => {
    const { panel } = await openMember("Camila Rojas");

    expect(
      within(panel).getByRole("radio", { name: "Asistente" }),
    ).toBeChecked();
    expect(
      within(panel).queryByLabelText("Código personal"),
    ).not.toBeInTheDocument();
  });
});
