import { useListAssistantClientBookings } from "@pilates/api-contracts";
import { useMemo } from "react";

import { useStaffFetcher } from "../staff-fetcher";

// The Sessions the Client already holds a Booking in, from the same list S21
// draws, so S07 and S08 can say so before the API refuses (UX-003). A
// Waitlist entry is not a Booking: the seat count stays. While the list is
// loading or failed nothing is marked and the server rule remains the net.
export function useClientBookedSessionIds(clientId: string): ReadonlySet<string> {
  const fetcher = useStaffFetcher();
  const bookings = useListAssistantClientBookings(clientId, {
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const items = bookings.data?.status === 200 ? bookings.data.data : undefined;
  return useMemo(
    () =>
      new Set(
        (items ?? []).filter((item) => item.kind === "booking").map((item) => item.sessionId),
      ),
    [items],
  );
}
