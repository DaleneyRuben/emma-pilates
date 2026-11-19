import {
  getListAdminClientsQueryKey,
  listAdminClients,
  type AdminClientPageDto,
  type ListAdminClientsParams,
} from "@pilates/api-contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { adminFetch } from "../../api/fetcher";

const settleMilliseconds = 250;
export const maxMatches = 5;

/** The text once typing paused, so each keystroke is not a request. */
function useSettled(text: string): string {
  const [settled, setSettled] = useState(text);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(text), settleMilliseconds);
    return () => clearTimeout(timer);
  }, [text]);
  // Clearing the field forgets the matches at once.
  return text === "" ? "" : settled;
}

/**
 * FIX-091 (W9 B): the first Clients whose name, phone or email match the
 * words, from Clientas' own search (studio-wide, accents and case aside).
 * `settled` is false while the shown matches answer older words.
 */
export function useClientMatches(words: string) {
  const settledWords = useSettled(words);
  const params: ListAdminClientsParams = {
    page: 1,
    pageSize: maxMatches,
    q: settledWords,
  };
  const query = useQuery({
    queryKey: getListAdminClientsQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdminClients(params, { signal }, adminFetch))
        .data as AdminClientPageDto,
    enabled: settledWords !== "",
    placeholderData: keepPreviousData,
  });
  return {
    clients: words === "" ? [] : (query.data?.items ?? []),
    settled:
      words === settledWords &&
      query.data !== undefined &&
      !query.isPlaceholderData,
    failed: query.isError,
  };
}
