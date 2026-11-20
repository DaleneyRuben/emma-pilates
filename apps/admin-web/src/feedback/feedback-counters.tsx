import type { AdminFeedbackPageDto } from "@pilates/api-contracts";
import { countFormat } from "../components/table/pagination";
import { StatTile, StatTiles } from "../components/ui/stat-tile";

// FIX-091 (W3 B): every comment in each status, whatever the filters.
export function FeedbackCounters({ page }: { page: AdminFeedbackPageDto }) {
  return (
    // Audit 4.g.4: three tiles overflow at 420 px, so one column below md.
    <StatTiles className="grid-cols-1">
      <StatTile
        label="Sin leer"
        tone="destacado"
        figure={countFormat.format(page.newCount)}
      />
      <StatTile
        label="Revisados"
        tone="medio"
        figure={countFormat.format(page.reviewedCount)}
      />
      <StatTile
        label="Resueltos"
        figure={countFormat.format(page.resolvedCount)}
      />
    </StatTiles>
  );
}
