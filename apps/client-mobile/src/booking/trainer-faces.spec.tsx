import type { UpcomingBookingDto } from "@pilates/api-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { ClientFetcherContext } from "../client-fetcher";
import { routeFetcher, staffPhotoRoute } from "../test-support";
import { BookingCard } from "./booking-card";
import { SessionFacts } from "./session-facts";

const hour = 60 * 60 * 1_000;
const daniela = { imageAssetId: "asset-daniela" };

async function renderWithFetcher(ui: ReactElement) {
  const fetcher = routeFetcher(staffPhotoRoute("asset-daniela"));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const screen = await render(
    <QueryClientProvider client={client}>
      <ClientFetcherContext.Provider value={fetcher}>{ui}</ClientFetcherContext.Provider>
    </QueryClientProvider>,
  );
  return { fetcher, screen };
}

const detail = (trainerPhoto: { imageAssetId: string } | null) => ({
  availableSeats: 3,
  bookedCount: 9,
  branch: { name: "Achumani" },
  capacity: 12,
  classType: { name: "Mat Pilates" },
  endsAt: new Date(Date.now() + 5 * hour).toISOString(),
  startsAt: new Date(Date.now() + 4 * hour).toISOString(),
  trainerName: "Daniela Ortiz",
  trainerPhoto,
});

const booking = (
  trainerPhoto: { imageAssetId: string } | null,
  startsIn = 26 * hour,
): UpcomingBookingDto => ({
  kind: "booking",
  bookingId: "booking-1",
  sessionId: "session-1",
  branchId: "branch-achumani",
  classTypeName: "Mat Pilates",
  trainerName: "Daniela Ortiz",
  trainerPhoto,
  branchName: "Achumani",
  startsAt: new Date(Date.now() + startsIn).toISOString(),
  endsAt: new Date(Date.now() + startsIn + hour).toISOString(),
});

const bookingCard = (item: UpcomingBookingDto) => (
  <BookingCard
    cancellationWindowMinutes={150}
    item={item}
    onCancel={jest.fn()}
    onLeave={jest.fn()}
    onReschedule={jest.fn()}
  />
);

// FIX-041 (follow-up 242): the Trainer's face on C04 and C05.
describe("the Trainer's face", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("replaces the class detail's initials circle with her 36 px photo", async () => {
    const { fetcher, screen } = await renderWithFetcher(
      <SessionFacts cancellationWindowMinutes={150} detail={detail(daniela)} full={false} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Foto de Daniela Ortiz")).toHaveStyle({ height: 36, width: 36 });
    });
    expect(fetcher).toHaveBeenCalledWith("/api/v1/staff-photos/asset-daniela?variant=thumbnail");
    expect(screen.queryByText("DO")).toBeNull();
  });

  it("keeps the class detail's initials when she has no photo", async () => {
    const { fetcher, screen } = await renderWithFetcher(
      <SessionFacts cancellationWindowMinutes={150} detail={detail(null)} full={false} />,
    );

    expect(screen.getByText("DO")).toBeOnTheScreen();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("puts her 20 px photo right before her name on a booking card", async () => {
    const { fetcher, screen } = await renderWithFetcher(bookingCard(booking(daniela)));

    await waitFor(() => {
      expect(screen.getByLabelText("Foto de Daniela Ortiz")).toHaveStyle({ height: 20, width: 20 });
    });
    expect(fetcher).toHaveBeenCalledWith("/api/v1/staff-photos/asset-daniela?variant=thumbnail");
    expect(screen.getByText("Daniela Ortiz")).toBeOnTheScreen();
    expect(screen.getByText("· Achumani")).toBeOnTheScreen();
  });

  it("shows her initials on a booking card when she has no photo", async () => {
    const { screen } = await renderWithFetcher(bookingCard(booking(null)));

    expect(screen.getByText("DO")).toBeOnTheScreen();
    expect(screen.getByText("Daniela Ortiz")).toBeOnTheScreen();
  });

  it("shows no face on a booking line that names no trainer", async () => {
    const { fetcher, screen } = await renderWithFetcher(bookingCard(booking(daniela, hour)));

    expect(screen.getByText(/ · faltan menos de 2 h 30$/)).toBeOnTheScreen();
    expect(screen.queryByLabelText("Foto de Daniela Ortiz")).toBeNull();
    expect(screen.queryByText("DO")).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
