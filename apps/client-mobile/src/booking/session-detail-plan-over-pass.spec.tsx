import { cleanup } from "@testing-library/react-native";
import { boliviaCivilDate, clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import { openDetail } from "./session-detail-test-support";

jest.setTimeout(20_000);

const today = boliviaCivilDate(new Date());

// Owner's decision of 2026-11-28: on a day a paid Plan covers, the Booking
// uses it and the Guest Pass stays unused. Seen in review: she cancelled her
// guest class after buying the Plan, which freed the pass, and a class from
// the Plan's start still read «Es tu clase gratis de invitada».
describe("the class detail on a Plan bought over an unused Guest Pass", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("says the class comes from the Plan, not the free class", async () => {
    const { screen } = await openDetail({
      "/api/v1/clients/current/subscription": () =>
        jsonResponse({
          status: "active",
          subscription: {
            id: "guest-pass",
            planName: "Pase de invitada",
            originalClassAllowance: 1,
            remainingClassAllowance: 0,
            extraClasses: 1,
            startsOn: today,
            endsOn: today,
            guestPass: { usedClassStartsAt: null },
          },
          nextSubscription: {
            id: "quarterly",
            planName: "Trimestral 36 clases",
            originalClassAllowance: 36,
            remainingClassAllowance: 36,
            startsOn: today,
            endsOn: "2027-02-27",
          },
        }),
    });

    expect(screen.getByText("Usarás 1 de tus 36 clases.")).toBeOnTheScreen();
    expect(screen.queryByText("Es tu clase gratis de invitada")).toBeNull();
  });
});
