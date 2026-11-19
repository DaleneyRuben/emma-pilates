import { screen, waitFor, within } from "@testing-library/react";
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
  const rendered = renderAdmin("/estudio/personal");
  await rendered.user.click(await screen.findByRole("button", { name }));
  return {
    ...rendered,
    panel: await screen.findByRole("dialog", { name: "Editar miembro" }),
  };
};

// BKM-011 (follow-up 143): the Administrator gives each Trainer her code.
// FIX-091 (W14 A): it saves with the panel's one «Guardar cambios».
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

  it("saves a new code with the panel's one «Guardar cambios»", async () => {
    server.use(
      http.put(apiUrl(codePath), async ({ request }) => {
        saved.push(await request.json());
        return jsonResponse({ staffMemberId: emma.id, referralCode: "EMMA" });
      }),
    );
    const { panel, user } = await openMember("Emma Vargas");
    const code = await within(panel).findByLabelText("Código personal");

    expect(code).toHaveValue("");
    expect(
      within(panel).queryByRole("button", { name: "Guardar código" }),
    ).not.toBeInTheDocument();
    await user.type(code, "emma");
    await user.click(
      within(panel).getByRole("button", { name: "Guardar cambios" }),
    );

    expect(
      await screen.findByText("Guardamos los cambios de Emma Vargas."),
    ).toBeVisible();
    expect(saved).toEqual([{ referralCode: "emma" }]);
    expect(
      screen.queryByRole("dialog", { name: "Editar miembro" }),
    ).not.toBeInTheDocument();
  });

  it("saves the code on Enter, as the rest of the form", async () => {
    server.use(
      http.put(apiUrl(codePath), async ({ request }) => {
        saved.push(await request.json());
        return jsonResponse({ staffMemberId: emma.id, referralCode: "EMMA" });
      }),
    );
    const { panel, user } = await openMember("Emma Vargas");
    await user.type(
      await within(panel).findByLabelText("Código personal"),
      "emma{Enter}",
    );

    await waitFor(() => expect(saved).toEqual([{ referralCode: "emma" }]));
    expect(
      await screen.findByText("Guardamos los cambios de Emma Vargas."),
    ).toBeVisible();
  });

  it("removes the current code when emptied", async () => {
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
      within(panel).getByRole("button", { name: "Guardar cambios" }),
    );

    expect(
      await screen.findByText("Guardamos los cambios de Emma Vargas."),
    ).toBeVisible();
    expect(saved).toEqual([{ referralCode: null }]);
  });

  it("sends no code when it did not change", async () => {
    server.use(
      referralCodeHandler("EMMA"),
      http.put(apiUrl(codePath), async ({ request }) => {
        saved.push(await request.json());
        return jsonResponse({ staffMemberId: emma.id, referralCode: "EMMA" });
      }),
    );
    const { panel, user } = await openMember("Emma Vargas");
    await within(panel).findByDisplayValue("EMMA");
    await user.click(
      within(panel).getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Editar miembro" }),
      ).not.toBeInTheDocument(),
    );
    expect(saved).toEqual([]);
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
      "Usa de 3 a 20 letras, números o guiones.",
    ],
    ["referral_code_blocked", 409, "Ese código no está permitido."],
  ])("explains a refused code (%s)", async (code, status, message) => {
    server.use(http.put(apiUrl(codePath), () => problemResponse(status, code)));
    const { panel, user } = await openMember("Emma Vargas");

    await user.type(
      await within(panel).findByLabelText("Código personal"),
      "LUZ",
    );
    await user.click(
      within(panel).getByRole("button", { name: "Guardar cambios" }),
    );

    // The panel stays open on the refusal, under the field.
    expect(await within(panel).findByText(message)).toBeInTheDocument();
    expect(within(panel).getByLabelText("Código personal")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
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
