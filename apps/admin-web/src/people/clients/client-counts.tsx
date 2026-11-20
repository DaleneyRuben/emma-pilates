import type { AdminClientPageDto } from "@pilates/api-contracts";
import { countFormat } from "../../components/table/pagination";
import { StatTile, StatTiles } from "../../components/ui/stat-tile";

// Rosa Emma (RW-clientas): the studio counts main already shows in the
// subtitle and the chips, lifted into the page's figure row: Clientas in
// Rosa profundo, those with an active Plan in Palo de rosa, then white.
export function ClientCounts({ page }: { page: AdminClientPageDto }) {
  return (
    <StatTiles className="mb-1">
      <StatTile
        label="Clientas"
        tone="destacado"
        figure={countFormat.format(page.studioClientCount)}
      />
      <StatTile
        label="con plan activo"
        tone="medio"
        figure={countFormat.format(page.activePlanClientCount)}
      />
      {page.expiringClientCount === undefined ? null : (
        <StatTile
          label="Por vencer"
          figure={countFormat.format(page.expiringClientCount)}
        />
      )}
      {page.unbookedClientCount === undefined ? null : (
        <StatTile
          label="Sin reservar"
          figure={countFormat.format(page.unbookedClientCount)}
        />
      )}
    </StatTiles>
  );
}
