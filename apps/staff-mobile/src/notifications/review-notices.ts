import type { NotificationDto, NotificationReviewDto } from "@pilates/api-contracts";
import { formatBolivianos, formatNotificationTime } from "@pilates/mobile-core";

export type NoticeLine = { title: string; detail: string };

const weekdays = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// «Del lun 23 al dom 29 nov» (E-F07): the month once when both days share it.
function freezeDays(startsOn: string | null, endsOn: string | null): string | null {
  if (startsOn === null || endsOn === null) return null;
  const start = new Date(`${startsOn}T12:00:00.000Z`);
  const end = new Date(`${endsOn}T12:00:00.000Z`);
  const day = (date: Date) => `${weekdays[date.getUTCDay()]} ${date.getUTCDate()}`;
  const month = (date: Date) => months[date.getUTCMonth()];
  return start.getUTCMonth() === end.getUTCMonth()
    ? `Del ${day(start)} al ${day(end)} ${month(end)}`
    : `Del ${day(start)} ${month(start)} al ${day(end)} ${month(end)}`;
}

const firstName = (name: string | null) => (name ?? "").trim().split(/\s+/)[0] ?? "";

// «hace 10 minutos», «ayer 19:40»: the notice time, inside a sentence.
const inline = (time: string) => time.charAt(0).toLowerCase() + time.slice(1).replace(",", "");

const verbs: Record<NotificationReviewDto["outcome"], string> = {
  approved: "aprobado",
  pending: "por revisar",
  rejected: "rechazado",
  withdrawn: "retirado",
};

/**
 * Walkthrough n.º 12 (E-F07): the Administrator's receipt and Freeze
 * notices, no longer grouped: pending ones on top, decided ones below, and
 * every other notice as before. A server without `review` keeps the old rows.
 */
export function splitStaffNotices(items: readonly NotificationDto[]): {
  pending: NotificationDto[];
  decided: NotificationDto[];
  rest: NotificationDto[];
} {
  const pending: NotificationDto[] = [];
  const decided: NotificationDto[] = [];
  const rest: NotificationDto[] = [];
  for (const item of items) {
    if (item.review === undefined || item.review === null) rest.push(item);
    else if (item.review.outcome === "pending") pending.push(item);
    else decided.push(item);
  }
  return { pending, decided, rest };
}

/** The two lines of a review notice (E-F07). */
export function reviewLine(notification: NotificationDto, now: Date): NoticeLine {
  const review = notification.review;
  if (review === undefined || review === null) {
    return { title: notification.title, detail: notification.message };
  }
  const amount = review.amountCentavos === null ? null : formatBolivianos(review.amountCentavos);
  const days = freezeDays(review.startsOn, review.endsOn);
  if (review.outcome === "pending") {
    return review.subject === "payment"
      ? {
          title: [review.clientName, review.planName, amount].filter(Boolean).join(" · "),
          detail: "Comprobante por revisar",
        }
      : {
          title: `${review.clientName} · ${review.planName}`,
          detail: ["Congelamiento por revisar", days].filter(Boolean).join(" · "),
        };
  }
  const subject = review.subject === "payment" ? "Pago" : "Congelamiento";
  const by =
    review.outcome === "withdrawn"
      ? `${verbs.withdrawn} por la clienta`
      : `${verbs[review.outcome]} por ${firstName(review.decidedByName)}`;
  const when =
    review.decidedAt === null ? null : inline(formatNotificationTime(review.decidedAt, now));
  return {
    title: [`${subject} de ${review.clientName} ${by}`, when].filter(Boolean).join(" · "),
    detail:
      review.subject === "payment"
        ? [review.planName, amount].filter(Boolean).join(" · ")
        : (days ?? review.planName),
  };
}

const typeWords = { other: "Otro", problem: "Problema", suggestion: "Sugerencia" } as const;
const appWords = { client: "App de clientas", staff: "App del personal" } as const;

/** Walkthrough n.º 11 (E-F20): who wrote a comment and how it begins. */
export function feedbackLine(notification: NotificationDto, now: Date): NoticeLine {
  const feedback = notification.feedback;
  if (feedback === undefined || feedback === null) {
    return {
      title: notification.message,
      detail: formatNotificationTime(notification.createdAt, now),
    };
  }
  return {
    title: `${feedback.authorName} · ${typeWords[feedback.type]}: «${feedback.excerpt}»`,
    detail: `${appWords[feedback.app]} · ${formatNotificationTime(notification.createdAt, now)}`,
  };
}
