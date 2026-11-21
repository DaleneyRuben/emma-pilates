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
const dayList = `/api/v1/sessions?branchId=branch-centro&from=${encodeURIComponent(from)}&until=${encodeURIComponent(until)}&limit=100&includeCancelled=true`;

// FIX-041 (follow-up 242): the Trainer's face wherever the Assistant sees her.
describe("The Trainer's face on the Assistant's screens", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
  });

  // FIX-089 (ClaseE): today's next class leads as the hero; the owner's pick C
  // leaves the rows after it with her name only.
  it("leads today with the next class hero and names her on the other rows without a face", async () => {
    const later = {
      ...session,
      id: "session-2",
      startsAt: new Date(Date.parse(session.startsAt) + 60 * minute).toISOString(),
      endsAt: new Date(Date.parse(session.endsAt) + 60 * minute).toISOString(),
      trainerPhoto: emmaPhoto,
    };
    const screen = await openLucia({
      ...assistantRoutes(),
      [dayList]: () => jsonResponse([session, later]),
      "/api/v1/staff-photos/asset-emma?variant=thumbnail": thumbnail,
    });
    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));

    await waitFor(() =>
      expect(
        within(screen.getByTestId("next-class-hero")).getByTestId("session-card-session-1"),
      ).toBeOnTheScreen(),
    );
    const row = screen.getByTestId("session-card-session-2");
    expect(within(row).getByText("Emma Vargas")).toBeOnTheScreen();
    expect(within(row).queryByLabelText("Foto de Emma Vargas")).toBeNull();
    expect(within(row).queryByText("EV")).toBeNull();
  });

  it("swaps the «Instructora» row's icon for her 36 px photo on S08", async () => {
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
    expect(within(row).getByText("Instructora")).toBeOnTheScreen();
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

  // FIX-081 (finding 118): «Instructor» beside a man's name.
  it("names a male Trainer «Instructor» on S08", async () => {
    const screen = await openLucia({
      ...assistantRoutes(),
      "/api/v1/sessions/session-1": () => jsonResponse({ ...sessionDetail, trainerGender: "male" }),
    });
    await fireEvent.press(screen.getByRole("button", { name: "Reservar clase" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Reformer Pilates \d/ })).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole("button", { name: /^Reformer Pilates \d/ }));

    const row = await screen.findByTestId("session-trainer-row");
    expect(within(row).getByText("Instructor")).toBeOnTheScreen();
  });

  it("names her on the reschedule option card without a face", async () => {
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
    expect(within(card).getByText("Emma Vargas")).toBeOnTheScreen();
    expect(within(card).queryByLabelText("Foto de Emma Vargas")).toBeNull();
    expect(within(card).queryByText("EV")).toBeNull();
  });
});
