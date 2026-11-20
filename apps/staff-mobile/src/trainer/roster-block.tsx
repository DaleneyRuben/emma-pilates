import { capacityLabel, formatListDate } from "@pilates/api-contracts";
import { formatStartTime, NextClassHero } from "@pilates/mobile-core";
import { View } from "react-native";

import { startTime } from "../ui/session-time";

const hour = 60;

/**
 * The block's top line (E6 B + A): «Empieza en 20 min» (or «Empieza a las
 * 08:00» further off) before the class, «En curso · termina 09:00» during it,
 * «Terminó a las 09:00» after it.
 */
export function rosterEyebrow(startsAt: string, endsAt: string, now: Date): string {
  const toStart = Math.ceil((new Date(startsAt).getTime() - now.getTime()) / 60_000);
  if (toStart > hour) return `Empieza a las ${formatStartTime(startsAt)}`;
  if (toStart > 0) return `Empieza en ${toStart} min`;
  if (new Date(endsAt).getTime() > now.getTime()) {
    return `En curso · termina ${formatStartTime(endsAt)}`;
  }
  return `Terminó a las ${formatStartTime(endsAt)}`;
}

/** «1 clienta nueva», «2 clientas nuevas». */
function newClientsLabel(count: number): string {
  return count === 1 ? "1 clienta nueva" : `${count} clientas nuevas`;
}

/**
 * The roster's Palo de rosa block (board E6C). Before the class it gives the
 * day, branch, places and new Clients; while taking attendance, how many are
 * marked.
 */
export function RosterBlock({
  booked,
  branchName,
  capacity,
  classTypeName,
  endsAt,
  marked,
  newClients,
  now,
  startsAt,
}: {
  booked: number;
  branchName: string;
  capacity: number;
  classTypeName: string;
  endsAt: string;
  /** How many are marked, while taking attendance; undefined before it. */
  marked?: number;
  newClients: number;
  now: Date;
  startsAt: string;
}) {
  const detail =
    marked === undefined
      ? [
          formatListDate(startsAt),
          branchName,
          capacityLabel(booked, capacity),
          newClients === 0 ? undefined : newClientsLabel(newClients),
        ]
          .filter(Boolean)
          .join(" · ")
      : `Marcadas ${marked} de ${booked}`;
  return (
    <View testID="roster-block">
      <NextClassHero
        detail={detail}
        eyebrow={rosterEyebrow(startsAt, endsAt, now)}
        testID="roster-block-hero"
        title={`${startTime(startsAt, endsAt)} · ${classTypeName}`}
      />
    </View>
  );
}
