import type { AdminFeedbackPageDto } from "@pilates/api-contracts";
import { countFormat } from "../components/table/pagination";
import { StatTile, StatTiles } from "../components/ui/stat-tile";

// FIX-091 (W3 B): every comment in each status, whatever the filters.
export function FeedbackCounters({ page }: { page: AdminFeedbackPageDto }) {
  return (
    <StatTiles className="grid-cols-3">
      <StatTile label="Sin leer" figure={countFormat.format(page.newCount)} />
      <StatTile
        label="Revisados"
        figure={countFormat.format(page.reviewedCount)}
      />
      <StatTile
        label="Resueltos"
        figure={countFormat.format(page.resolvedCount)}
      />
    </StatTiles>
  );
}
