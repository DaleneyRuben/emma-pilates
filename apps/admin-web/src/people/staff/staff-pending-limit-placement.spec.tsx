import { within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, problemResponse, server, useMockServer } from "../../test/msw";
import { allBranchesHandler, valentina } from "../../test/people-fixtures";
import { signedInHandlers } from "../../test/session-handlers";
import { list, memberPath, openMember } from "../../test/staff-panel-support";

const limited = (code: string, retryAfter: string) => () =>
  problemResponse(429, code, { headers: { "Retry-After": retryAfter } });

const pendingCard = (panel: HTMLElement) => {
  const card = within(panel).getByText("Pendiente de activación").closest("section");
  if (card === null) throw new Error("no pending card");
  return card;
};

const contactRow = (panel: HTMLElement, label: string) => {
  const row = within(panel).getByText(label, { selector: "dt" }).parentElement;
  if (row === null) throw new Error(`no ${label} row`);
  return row;
};

const follows = (first: Element, second: Element) =>
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

// WEB-014, follow-ups 54 and 78: AW24's pending panel draws both limits as the
// clock notice at the top of the body, above the contact rows.
describe("AW24's pending panel limit placement", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers(), allBranchesHandler()));

  it.each([
    ["the recipient's", "email_throttled", "40", "Podrás reenviarlo en 0:40."],
    ["the Administrator's", "staff_email_throttled", "892", "Podrás enviarlo en 14:52."],
  ])("draws %s limit first in the body, outside the pending card", async (_lane, code, retryAfter, wait) => {
    server.use(
      list(),
      http.post(
        apiUrl(`${memberPath(valentina.id)}/activation-link`),
        limited(code, retryAfter),
      ),
    );
    const { panel, user } = await openMember("Valentina Soria");

    await user.click(within(panel).getByRole("button", { name: "Reenviar enlace" }));

    const countdown = await within(panel).findByText(wait);
    const notice = countdown.closest('[role="status"]');
    expect(notice).not.toBeNull();
    expect(notice?.parentElement?.firstElementChild).toBe(notice);
    expect(pendingCard(panel).contains(notice)).toBe(false);
    expect(follows(notice as Element, contactRow(panel, "Nombre"))).toBe(true);
    expect(within(panel).getByRole("button", { name: "Reenviar enlace" })).toBeDisabled();
  });

  it("draws the pending card between the name and the phone, with no separate email row", async () => {
    server.use(list());
    const { panel } = await openMember("Valentina Soria");

    const card = pendingCard(panel);
    expect(follows(contactRow(panel, "Nombre"), card)).toBe(true);
    expect(follows(card, contactRow(panel, "Teléfono"))).toBe(true);
    expect(within(panel).queryByText("Correo", { selector: "dt" })).toBeNull();
    expect(within(card).getByText(valentina.email)).toBeVisible();
  });
});
