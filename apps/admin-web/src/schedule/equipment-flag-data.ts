import {
  getListEquipmentFlaggedSessionsQueryKey,
  listEquipmentFlaggedSessions,
  type EquipmentFlaggedSessionDto,
} from "@pilates/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { adminFetch } from "../api/fetcher";
import { addDays, boliviaInstant } from "../lib/bolivia-time";

export type EquipmentFlag = EquipmentFlaggedSessionDto;

export const kindPlurals: Record<EquipmentFlag["kind"], string> = {
  reformer: "reformers",
  cadillac: "cadillacs",
  mat: "mats",
};

// ADR-0042: the key names the Branch and the week, like the week's Sessions.
export const weekFlagsQueryOptions = (branchId: string, monday: string) => {
  const params = {
    branchId,
    from: boliviaInstant(monday, "00:00"),
    until: boliviaInstant(addDays(monday, 7), "00:00"),
  };
  return queryOptions({
    queryKey: getListEquipmentFlaggedSessionsQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listEquipmentFlaggedSessions(params, { signal }, adminFetch))
        .data as EquipmentFlag[],
  });
};

/** The week's flags by Session, read by every Session block. */
export const EquipmentFlagsContext = createContext<
  ReadonlyMap<string, EquipmentFlag>
>(new Map());

export const useEquipmentFlag = (sessionId: string) =>
  useContext(EquipmentFlagsContext).get(sessionId);

export const flagLabel = (flag: EquipmentFlag) =>
  `faltan equipos: ${flag.workingCount} ${kindPlurals[flag.kind]} funcionando para ${flag.capacity} lugares`;
