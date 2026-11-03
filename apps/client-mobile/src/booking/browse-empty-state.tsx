import { useListSessionAvailability } from "@pilates/api-contracts";
import { boliviaCivilDate, civilDateRange, hasStarted, StateScreen } from "@pilates/mobile-core";

import { useClientFetcher } from "../client-fetcher";

const weekdayFormatter = new Intl.DateTimeFormat("es-BO", { timeZone: "UTC", weekday: "long" });

/** «jueves 5» for a civil date. */
export function dayName(civilDate: string): string {
  const date = new Date(`${civilDate}T12:00:00.000Z`);
  return `${weekdayFormatter.format(date)} ${date.getUTCDate()}`;
}

/**
 * The next day of the strip with a Session of the chosen Class Type (walkthrough
 * n.º 6, extra): one week query, made only while the filtered day is empty.
 */
function useNextDayWithClassType({
  branchId,
  classTypeId,
  dates,
  enabled,
  selectedDate,
}: {
  branchId: string | undefined;
  classTypeId: string;
  dates: readonly string[];
  enabled: boolean;
  selectedDate: string;
}): string | undefined {
  const fetcher = useClientFetcher();
  const week = useListSessionAvailability(
    {
      branchId: branchId ?? "",
      from: civilDateRange(dates[0]).from,
      until: civilDateRange(dates[dates.length - 1]).until,
      limit: 100,
    },
    { fetcher, query: { enabled: enabled && branchId !== undefined } },
  );
  if (!enabled || week.data?.status !== 200) return undefined;
  const now = new Date();
  const days = new Set(
    week.data.data
      .filter(
        (session) => session.classTypeId === classTypeId && !hasStarted(session.startsAt, now),
      )
      .map((session) => boliviaCivilDate(new Date(session.startsAt))),
  );
  const later = dates.filter((date) => date > selectedDate && days.has(date));
  return later[0] ?? dates.find((date) => date !== selectedDate && days.has(date));
}

/** 03's two empty states, each with its action (walkthrough n.º 6, option A). */
export function BrowseEmptyState({
  branchId,
  classTypeName,
  classTypeId,
  dates,
  onSelectDate,
  onShowAll,
  selectedDate,
  today,
}: {
  branchId: string | undefined;
  /** The chosen Class Type, or undefined for «Todas». */
  classTypeName: string | undefined;
  classTypeId: string;
  dates: readonly string[];
  onSelectDate: (date: string) => void;
  onShowAll: () => void;
  selectedDate: string;
  today: string;
}) {
  const filtered = classTypeName !== undefined;
  const nextWithType = useNextDayWithClassType({
    branchId,
    classTypeId,
    dates,
    enabled: filtered,
    selectedDate,
  });

  if (filtered) {
    const day = selectedDate === today ? "Hoy" : `El ${dayName(selectedDate).split(" ")[0]}`;
    return (
      <StateScreen
        icon="calendar"
        note="Prueba otro día o mira todas las clases de este día."
        primaryAction={{ label: "Ver todas las clases", onPress: onShowAll }}
        testID="browse-empty"
        textAction={
          nextWithType === undefined
            ? undefined
            : {
                label: `Ver el ${dayName(nextWithType)}`,
                onPress: () => onSelectDate(nextWithType),
              }
        }
        title={`${day} no hay ${classTypeName}`}
      />
    );
  }

  const next = dates[dates.indexOf(selectedDate) + 1];
  return (
    <StateScreen
      icon="calendar"
      note="Elige otro día de la semana para reservar."
      primaryAction={
        next === undefined
          ? undefined
          : {
              label: selectedDate === today ? "Ver mañana" : `Ver el ${dayName(next)}`,
              onPress: () => onSelectDate(next),
            }
      }
      testID="browse-empty"
      title="Este día no hay clases"
    />
  );
}
