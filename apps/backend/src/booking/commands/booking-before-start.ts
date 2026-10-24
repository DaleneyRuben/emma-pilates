// A Subscription that covers the Session's date but has not started yet is a
// different refusal from having no classes left (booking ADR-0005). The detail
// carries the civil Start Date so the app can name it.
export const bookingBeforeStartMessage = (startsOn: Date): string =>
  `Booking is before the Start Date: ${startsOn.toISOString().slice(0, 10)}`;
