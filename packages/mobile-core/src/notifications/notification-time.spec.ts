import { formatNotificationTime } from "./notification-time";

const now = new Date("2026-09-22T15:00:00.000Z");

function secondsAgo(seconds: number): string {
  return new Date(now.getTime() - seconds * 1000).toISOString();
}

// Walkthrough finding 59 (FIX-063): under a minute is «Hace un momento», never «Hace 0 minutos».
describe("formatNotificationTime", () => {
  it.each([0, 1, 59])("says «Hace un momento» %i seconds after", (seconds) => {
    expect(formatNotificationTime(secondsAgo(seconds), now)).toBe("Hace un momento");
  });

  it("says «Hace un momento» when the clock is slightly behind the server", () => {
    expect(formatNotificationTime(secondsAgo(-30), now)).toBe("Hace un momento");
  });

  it("counts minutes from the first full minute", () => {
    expect(formatNotificationTime(secondsAgo(60), now)).toBe("Hace 1 minuto");
    expect(formatNotificationTime(secondsAgo(119), now)).toBe("Hace 1 minuto");
    expect(formatNotificationTime(secondsAgo(20 * 60), now)).toBe("Hace 20 minutos");
  });
});
