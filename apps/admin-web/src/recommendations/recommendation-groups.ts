import type { RecommendationDto } from "@pilates/api-contracts";
import { weekdayName } from "../lib/bolivia-time";

export type RecommendationGroup = {
  key: string;
  kind: "schedule" | "clients";
  title: string;
  note: string;
  /** Every finding the row stands for; «Descartar» settles them all. */
  ids: string[];
  link:
    | { label: string; to: "/horario" }
    | {
        label: string;
        to: "/clientas";
        search?: { q: string; cliente: string };
      };
};

/** «lunes, martes y jueves». */
const spoken = (words: readonly string[]) =>
  words.length <= 1
    ? (words[0] ?? "")
    : `${words.slice(0, -1).join(", ")} y ${words[words.length - 1]}`;

const scheduleGroup = (
  key: string,
  items: readonly RecommendationDto[],
): RecommendationGroup => {
  const days = [...new Set(items.map((item) => item.weekday ?? 0))]
    .sort((a, b) => a - b)
    .map(weekdayName)
    .filter((day) => day !== "");
  const trainer = items[0]?.trainerName ?? "una entrenadora";
  return {
    key: `schedule:${key}`,
    kind: "schedule",
    title: `Revisa el horario de ${trainer}`,
    note: `${days.length} ${days.length === 1 ? "día" : "días"} de la semana: ${spoken(days)}`,
    ids: items.map((item) => item.id),
    link: { label: "Ver horario", to: "/horario" },
  };
};

const clientsGroup = (
  items: readonly RecommendationDto[],
): RecommendationGroup => {
  const names = items.map((item) => item.clientName ?? "una clienta");
  const count = items.length;
  const first = items[0]!;
  return {
    key: "clients",
    kind: "clients",
    title:
      count === 1
        ? "Contacta a 1 clienta con plan vigente que no reservó"
        : `Contacta a ${count} clientas con plan vigente que no reservaron`,
    note:
      count <= 3
        ? spoken(names)
        : `${names.slice(0, 3).join(", ")} y ${count - 3} más`,
    ids: items.map((item) => item.id),
    // One Client opens her file in Clientas, as Comentarios does (FIX-063).
    link:
      count === 1 && first.clientName != null
        ? {
            label: "Contactar",
            to: "/clientas",
            search: {
              q: first.clientName,
              cliente: first.clientId ?? first.subject,
            },
          }
        : { label: "Ver clientas", to: "/clientas" },
  };
};

const settled = new Set<RecommendationDto["state"]>(["resolved", "dismissed"]);

/**
 * FIX-084 (Inicio A): the month's open findings grouped by person or type,
 * one row per Trainer's schedule and one for every Client to contact.
 * `open` counts the findings behind them, for «Ver las N».
 */
export function recommendationGroups(
  recommendations: readonly RecommendationDto[],
): { groups: RecommendationGroup[]; open: number } {
  const open = recommendations.filter((item) => !settled.has(item.state));
  const byTrainer = new Map<string, RecommendationDto[]>();
  const clients: RecommendationDto[] = [];
  for (const item of open) {
    if (item.rule === "inactive_client") {
      clients.push(item);
      continue;
    }
    const key = item.trainerName ?? item.subject.split(":")[0] ?? item.subject;
    byTrainer.set(key, [...(byTrainer.get(key) ?? []), item]);
  }
  return {
    groups: [
      ...[...byTrainer].map(([key, items]) => scheduleGroup(key, items)),
      ...(clients.length === 0 ? [] : [clientsGroup(clients)]),
    ],
    open: open.length,
  };
}
