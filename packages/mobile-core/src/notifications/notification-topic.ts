import type { NotificationDto } from "@pilates/api-contracts";

import type { GlyphName } from "../ui/glyph";

const byType: Readonly<Record<string, GlyphName>> = {
  payment_confirmed: "card",
  payment_rejected: "card",
  payment_submitted: "card",
  invoice_ready: "document",
  freeze_approved: "snowflake",
  freeze_refused: "snowflake",
  freeze_requested: "snowflake",
  subscription_expiring: "hourglass",
  founder_membership_lost: "tag",
  session_cancelled: "calendarX",
  session_rescheduled_by_studio: "calendar",
  session_assigned: "calendar",
  waitlist_promoted: "calendar",
  class_reminder_day: "clock",
  class_reminder_hour: "clock",
  feedback_received: "message",
  payout_qr_expiring: "receipt",
  payout_qr_expired: "receipt",
};

const byPrefix: readonly (readonly [string, GlyphName])[] = [
  ["evaluation_", "leaf"],
  ["lifecycle_", "message"],
];

const byCategory: Readonly<Record<string, GlyphName>> = {
  booking_schedule: "calendar",
  reminder: "bell",
  subscription_payment: "card",
  announcement: "message",
};

/** C2 C: the topic icon of a notice, by its type, else by its category. */
export function notificationTopicIcon({
  category,
  type,
}: Pick<NotificationDto, "category" | "type">): GlyphName {
  if (Object.hasOwn(byType, type)) return byType[type];
  const prefixed = byPrefix.find(([prefix]) => type.startsWith(prefix));
  if (prefixed !== undefined) return prefixed[1];
  return Object.hasOwn(byCategory, category) ? byCategory[category] : "bell";
}
