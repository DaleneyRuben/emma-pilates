import { useMutation } from "@tanstack/react-query";
import { countFormat } from "../../components/table/pagination";
import { saveFile } from "../../lib/save-file";
import type { ClientSearch } from "../people-search";
import { fetchAllClients } from "./client-queries";
import { clientsCsv, clientsCsvName, closedAccountsCsv } from "./clients-csv";
import { fetchAllClosedAccounts } from "./closed-accounts/closed-account-queries";

const counted = (count: number, one: string, many: string) =>
  `${countFormat.format(count)} ${count === 1 ? one : many}`;

/**
 * FIX-065 (walkthrough finding 91, follow-up 268): «Exportar CSV» downloads
 * what the chip and the search show, at once, and answers the line the page
 * shows: «Descargamos clientas-con-plan-2026-11-17.csv con 3 clientas.»
 */
export function useClientsExport(search: ClientSearch) {
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const name = clientsCsvName(search.filter, new Date());
      if (search.filter === "closed") {
        const contacts = await fetchAllClosedAccounts(search.q);
        saveFile(name, closedAccountsCsv(contacts), "text/csv;charset=utf-8");
        return `Descargamos ${name} con ${counted(contacts.length, "exclienta", "exclientas")}.`;
      }
      const rows = await fetchAllClients(search.filter, search.q);
      saveFile(name, clientsCsv(rows), "text/csv;charset=utf-8");
      return `Descargamos ${name} con ${counted(rows.length, "clienta", "clientas")}.`;
    },
  });
}
