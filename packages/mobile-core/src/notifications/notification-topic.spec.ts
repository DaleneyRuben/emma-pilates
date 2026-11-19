import { notificationTopicIcon } from "./notification-topic";

describe("notificationTopicIcon", () => {
  it.each([
    ["payment_confirmed", "subscription_payment", "card"],
    ["payment_rejected", "subscription_payment", "card"],
    ["invoice_ready", "subscription_payment", "document"],
    ["freeze_approved", "subscription_payment", "snowflake"],
    ["freeze_refused", "subscription_payment", "snowflake"],
    ["subscription_expiring", "reminder", "hourglass"],
    ["founder_membership_lost", "reminder", "tag"],
    ["session_cancelled", "booking_schedule", "calendarX"],
    ["session_rescheduled_by_studio", "booking_schedule", "calendar"],
    ["waitlist_promoted", "booking_schedule", "calendar"],
    ["class_reminder_day", "reminder", "clock"],
    ["class_reminder_hour", "reminder", "clock"],
    ["evaluation_cancelled_by_studio", "booking_schedule", "leaf"],
    ["evaluation_reminder_day", "reminder", "leaf"],
    ["lifecycle_week_1", "reminder", "message"],
  ] as const)("draws %s with its topic icon", (type, category, icon) => {
    expect(notificationTopicIcon({ category, type })).toBe(icon);
  });

  it.each([
    ["booking_schedule", "calendar"],
    ["reminder", "bell"],
    ["subscription_payment", "card"],
    ["announcement", "message"],
  ] as const)("falls back to the %s category's icon for an unknown type", (category, icon) => {
    expect(notificationTopicIcon({ category, type: "something_new" })).toBe(icon);
  });
});
