import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { boliviaCivilDate, civilDateRange, clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse } from "../test-support";
import {
  assistantRoutes,
  from,
  minute,
  openLucia,
  session,
  sessionDetail,
  soonBooking,
  until,
} from "./assistant-fixtures";

jest.setTimeout(20_000);

const emmaPhoto = { imageAssetId: "asset-emma" };
const thumbnail = () =>
  new Response(new Uint8Array([255, 216, 255, 224]), {
    headers: { "Content-Type": "image/jpeg" },
    status: 200,
  });
const dayList = `/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100`;

// FIX-041 (follow-up 242): the Trainer's face wherever the Assistant sees her.
describe("The Trainer's face on the Assistant's screens", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  it("leads each class of S07 with her photo", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      [dayList]: () => jsonResponse([{ ...session, trainerPhoto: emmaPhoto }]),
      "/api/v1/staff-photos/asset-emma?variant=thumbnail": thumbnail,
    });
    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));

    await waitFor(() =>
      expect(
        within(screen.getByTestId("session-card-session-1")).getByLabelText("Foto de Emma Vargas"),
      ).toHaveStyle({ width: 20, height: 20 }),
    );
  });

  it("swaps the «Entrenadora» row's icon for her 36 px photo on S08", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/sessions/session-1": () =>
        jsonResponse({ ...sessionDetail, trainerPhoto: emmaPhoto }),
      "/api/v1/staff-photos/asset-emma?variant=thumbnail": thumbnail,
    });
    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));

    const row = await screen.findByTestId("session-trainer-row");
    await waitFor(() =>
      expect(within(row).getByLabelText("Foto de Emma Vargas")).toHaveStyle({
        width: 36,
        height: 36,
      }),
    );
    expect(within(row).getByText("Entrenadora")).toBeOnTheScreen();
    expect(within(row).queryByTestId("icon-row-disc")).toBeNull();
  });

  it("shows her initials on S08 while she has no photo", async () => {
    const screen = await openLucia(assistantRoutes());
    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));

    const row = await screen.findByTestId("session-trainer-row");
    expect(within(row).getByText("EV")).toBeOnTheScreen();
  });

  it("puts her face on the reschedule option card", async () => {
    const alternativeStart = new Date(new Date(soonBooking.startsAt).getTime() + minute);
    const { from: dayFrom, until: dayUntil } = civilDateRange(boliviaCivilDate(alternativeStart));
    const screen = await openLucia({
      ...assistantRoutes(),
      [`/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(dayFrom)}&until=${encodeURIComponent(dayUntil)}&limit=100`]:
        () =>
          jsonResponse([
            {
              ...session,
              id: "session-alt",
              startsAt: alternativeStart.toISOString(),
              endsAt: new Date(alternativeStart.getTime() + 50 * minute).toISOString(),
              trainerPhoto: emmaPhoto,
            },
          ]),
      "/api/v1/staff-photos/asset-emma?variant=thumbnail": thumbnail,
    });
    await fireEvent.press(screen.getByTestId("client-overview-bookings"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Reprogramar" })).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Reprogramar" }));

    const card = await screen.findByRole("button", { name: /^Reformer Pilates \d/ });
    await waitFor(() =>
      expect(within(card).getByLabelText("Foto de Emma Vargas")).toHaveStyle({ width: 20 }),
    );
  });
});
