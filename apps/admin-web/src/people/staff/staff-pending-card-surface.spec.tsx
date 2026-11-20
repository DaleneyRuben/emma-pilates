import { within } from "@testing-library/react";
import { server, useMockServer } from "../../test/msw";
import { allBranchesHandler } from "../../test/people-fixtures";
import { signedInHandlers } from "../../test/session-handlers";
import { list, openMember } from "../../test/staff-panel-support";

const pendingCard = (panel: HTMLElement) => {
  const card = within(panel)
    .getByText("Pendiente de activación")
    .closest("section");
  if (card === null) throw new Error("no pending card");
  return card;
};

// The full-width button of AW24's pending card (in px: the root is 15 px):
// FIX-089 draws it as the secondary button, Crema with a Rosa profundo
// border, 44 px tall.
const cardButton = [
  "h-[44px]",
  "w-full",
  "inset-ring-primario",
  "bg-superficie",
  "text-texto",
  "tipo-boton",
];

// WEB-015: AW24's pending card as the export draws it.
describe("AW24's pending card surface", () => {
  useMockServer();
  beforeEach(() =>
    server.use(...signedInHandlers(), allBranchesHandler(), list()),
  );

  it("draws the card as a white card with no border (follow-up 225, Rosa Emma)", async () => {
    const { panel } = await openMember("Valentina Soria");

    const card = pendingCard(panel);
    expect(card).toHaveClass(
      "gap-2.5",
      "rounded-tarjeta",
      "bg-superficie",
      "p-4",
    );
    expect(card).not.toHaveClass("bg-aviso");
  });

  it("puts the address and «Cambiar correo» on one row and tones the two lifetimes apart", async () => {
    const { panel } = await openMember("Valentina Soria");

    const card = within(pendingCard(panel));
    const change = card.getByRole("button", { name: "Cambiar correo" });
    expect(change.parentElement).toHaveClass("justify-between");
    expect(card.getByText(/^El enlace vence el/)).toHaveClass(
      "tipo-compacto",
      "text-texto",
    );
    expect(card.getByText(/^Si no activa su cuenta/)).toHaveClass(
      "tipo-secundario",
      "text-texto",
    );
  });

  it("draws «Reenviar enlace» as the full-width white button", async () => {
    const { panel } = await openMember("Valentina Soria");

    expect(
      within(pendingCard(panel)).getByRole("button", {
        name: "Reenviar enlace",
      }),
    ).toHaveClass(...cardButton);
  });

  it("draws «Guardar correo» and «Cancelar» as two equal white buttons", async () => {
    const { panel, user } = await openMember("Valentina Soria");
    const card = within(pendingCard(panel));

    await user.click(card.getByRole("button", { name: "Cambiar correo" }));

    for (const name of ["Guardar correo", "Cancelar"]) {
      expect(card.getByRole("button", { name })).toHaveClass(
        ...cardButton,
        "flex-1",
      );
    }
    // Where «Reenviar enlace» sits: after the two lifetimes.
    const note = card.getByText(/^Si no activa su cuenta/);
    const save = card.getByRole("button", { name: "Guardar correo" });
    expect(
      note.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  });
});
