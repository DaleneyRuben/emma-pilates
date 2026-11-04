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

// The full-width, 40 px button of AW24's pending card (in px: the root is
// 15 px, so 2.5rem draws 37.5): on v2 (follow-up 225) a Marfil button on the
// Lino card, with no border, and the same ground while disabled.
const cardButton = [
  "h-[40px]",
  "w-full",
  "bg-superficie",
  "text-texto",
  "text-fila-menu",
  "disabled:bg-superficie",
];

// WEB-015: AW24's pending card as the export draws it.
describe("AW24's pending card surface", () => {
  useMockServer();
  beforeEach(() =>
    server.use(...signedInHandlers(), allBranchesHandler(), list()),
  );

  it("draws the card as a Lino card with no border (follow-up 225)", async () => {
    const { panel } = await openMember("Valentina Soria");

    const card = pendingCard(panel);
    expect(card).toHaveClass("gap-2.5", "rounded-marco", "bg-lino", "p-4");
    expect(card).not.toHaveClass("bg-advertencia/10");
  });

  it("puts the address and «Cambiar correo» on one row and tones the two lifetimes apart", async () => {
    const { panel } = await openMember("Valentina Soria");

    const card = within(pendingCard(panel));
    const change = card.getByRole("button", { name: "Cambiar correo" });
    expect(change.parentElement).toHaveClass("justify-between");
    expect(card.getByText(/^El enlace vence el/)).toHaveClass(
      "text-[12.5px]",
      "text-texto-secundario",
    );
    expect(card.getByText(/^Si no activa su cuenta/)).toHaveClass(
      "text-texto-muy-tenue",
    );
  });

  it("draws «Reenviar enlace» as the full-width Marfil button", async () => {
    const { panel } = await openMember("Valentina Soria");

    expect(
      within(pendingCard(panel)).getByRole("button", {
        name: "Reenviar enlace",
      }),
    ).toHaveClass(...cardButton);
  });

  it("draws «Guardar correo» and «Cancelar» as two equal Marfil buttons", async () => {
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
