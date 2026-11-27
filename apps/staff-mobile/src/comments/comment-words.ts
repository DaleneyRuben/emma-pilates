import type {
  AdminFeedbackDto,
  ListAdminFeedbackApp,
  ListAdminFeedbackStatus,
  ListAdminFeedbackType,
} from "@pilates/api-contracts";

// Walkthrough n.º 11 (E-F18, E-F19, E-F25): the words the Staff app's
// Comentarios uses, the same as the admin web's.
export const typeWords: Record<AdminFeedbackDto["type"], string> = {
  other: "Otro",
  problem: "Problema",
  suggestion: "Sugerencia",
};

export const appWords: Record<AdminFeedbackDto["app"], string> = {
  client: "App de clientas",
  staff: "App del personal",
};

// The filter sheet and its chip say the app shorter.
export const appFilterWords: Record<ListAdminFeedbackApp, string> = {
  client: "Clientas",
  staff: "Personal",
};

export const statusTabs: readonly { key: ListAdminFeedbackStatus; label: string }[] = [
  { key: "new", label: "Nuevos" },
  { key: "reviewed", label: "Revisados" },
  { key: "resolved", label: "Resueltos" },
];

export type CommentFilters = { type?: ListAdminFeedbackType; app?: ListAdminFeedbackApp };

/** «Problema · Clientas»: the one chip under «Filtrar»; null without filters. */
export function filterSummary(filters: CommentFilters): string | null {
  const parts = [
    filters.type === undefined ? null : typeWords[filters.type],
    filters.app === undefined ? null : appFilterWords[filters.app],
  ].filter((part): part is string => part !== null);
  return parts.length === 0 ? null : parts.join(" · ");
}

export const filterCount = (filters: CommentFilters): number =>
  (filters.type === undefined ? 0 : 1) + (filters.app === undefined ? 0 : 1);

export const commentCount = (count: number) =>
  `${count} ${count === 1 ? "comentario" : "comentarios"}`;

const boliviaTimeZone = "America/La_Paz";
const dayKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: boliviaTimeZone }).format(date);
const clock = (date: Date) =>
  new Intl.DateTimeFormat("es-BO", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: boliviaTimeZone,
  }).format(date);
const weekdays = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** «jue 26 nov», in La Paz. */
export function commentDay(createdAt: string): string {
  const [year, month, day] = dayKey(new Date(createdAt)).split("-").map(Number);
  const civil = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  return `${weekdays[civil.getUTCDay()]} ${civil.getUTCDate()} ${months[civil.getUTCMonth()]}`;
}

/** «hoy 11:20», «ayer 19:40» or «jue 26 nov» (E-F18). */
export function commentTime(createdAt: string, now: Date): string {
  const created = new Date(createdAt);
  if (dayKey(created) === dayKey(now)) return `hoy ${clock(created)}`;
  if (dayKey(created) === dayKey(new Date(now.getTime() - 24 * 60 * 60_000))) {
    return `ayer ${clock(created)}`;
  }
  return commentDay(createdAt);
}

/** «jue 26 nov · 11:20» on the detail (E-F19). */
export const commentSentAt = (createdAt: string) =>
  `${commentDay(createdAt)} · ${clock(new Date(createdAt))}`;

const roleWords: Record<AdminFeedbackDto["role"], string> = {
  administrator: "Administradora",
  assistant: "Asistente",
  client: "Clienta",
  coordinator: "Coordinadora",
  nutritionist: "Nutricionista",
  trainer: "Instructora",
};

/** «Clienta · ana@example.com» under the sender's name (E-F19). */
export const senderLine = (comment: AdminFeedbackDto) =>
  `${roleWords[comment.role]} · ${comment.senderEmail}`;

/** «App de clientas · 1.1.0 · iOS 26.2» (E-F19). */
export const appLine = (comment: AdminFeedbackDto) =>
  `${appWords[comment.app]} · ${comment.appVersion} · ${
    comment.platform === "ios" ? "iOS" : "Android"
  } ${comment.osVersion}`;
