import { render } from "@testing-library/react-native";
import type { ReferredClientDto } from "@pilates/api-contracts";

import { EvaluationSlotPicker } from "./evaluations/evaluation-slot-picker";
import { InvoiceDisclosure } from "./payments/invoice-disclosure";
import { ReceiptRow } from "./payments/receipt-row";
import { ReferredList } from "./payments/referral-parts";
import { ClientAvatar } from "./profile/client-avatar";
import { ancestorBackgrounds } from "./test-support";

const hidden = { includeHiddenElements: true };
const rubor = "#E7CCBF";
const initialsCircle = { backgroundColor: "#B78380" };

// FIX-089 (palette B): no tinted disc behind an icon, and every initials
// circle is Palo de rosa with Crema initials, like the shared PersonAvatar.
describe("Client icons and initials in palette B", () => {
  it("draws the invoice question's receipt icon plain", async () => {
    const screen = await render(
      <InvoiceDisclosure
        onChange={jest.fn()}
        value={{ name: "", prefilled: false, taxId: "", wantsInvoice: false }}
      />,
    );

    expect(ancestorBackgrounds(screen.getByTestId("glyph-receipt", hidden))).not.toContain(rubor);
  });

  it("draws the receipt row's upload icon plain", async () => {
    const screen = await render(
      <ReceiptRow onAttach={jest.fn()} onRemove={jest.fn()} receipt={null} uploading={false} />,
    );

    expect(ancestorBackgrounds(screen.getByTestId("glyph-upload", hidden))).not.toContain(rubor);
  });

  it("draws an invited friend's initials on a Palo de rosa circle", async () => {
    const referred = {
      createdAt: "2026-11-01T12:00:00.000Z",
      invitationStatus: "registered",
      referredClientId: "client-2",
      referredName: "Carla M.",
      state: "pending",
    } as ReferredClientDto;
    const screen = await render(<ReferredList referred={[referred]} />);

    const initials = screen.getByText("CM");
    expect(initials).toHaveStyle({ color: "#F9F4F2", fontFamily: "WorkSans_600SemiBold" });
    expect(ancestorBackgrounds(initials)[0]).toBe(initialsCircle.backgroundColor);
  });

  it("draws the Client's own initials on a Palo de rosa circle", async () => {
    const screen = await render(<ClientAvatar name="Carla Méndez" photoUri={null} size={44} />);

    const initials = screen.getByText("CM");
    expect(initials).toHaveStyle({ color: "#F9F4F2", fontFamily: "WorkSans_600SemiBold" });
    expect(ancestorBackgrounds(initials)[0]).toBe(initialsCircle.backgroundColor);
  });

  it("draws the Nutritionist's initials on a Palo de rosa circle", async () => {
    const slot = {
      bookable: true,
      branchId: "branch-1",
      branchName: "Centro",
      durationMinutes: 45,
      endsAt: "2026-12-01T13:45:00.000Z",
      id: "slot-1",
      included: true,
      nutritionistName: "Gabriela Flores",
      priceCentavos: 0,
      startsAt: "2026-12-01T13:00:00.000Z",
    };
    const screen = await render(
      <EvaluationSlotPicker days={[{ date: "2026-12-01", slots: [slot] }]} onPick={jest.fn()} />,
    );

    const initials = screen.getByText("GF");
    expect(initials).toHaveStyle({ color: "#F9F4F2" });
    expect(ancestorBackgrounds(initials)[0]).toBe(initialsCircle.backgroundColor);
  });
});
