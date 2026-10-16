import { Plus } from "lucide-react";
import { formatLongDay } from "../lib/bolivia-time";
import { hourLabel } from "./week-slots";
import type { SessionStart } from "./session-create-form";

// The slot draws nothing at rest; hover and keyboard focus show the Hover de
// fila fill, a dashed Palo de rosa border, and «+ HH:00» (follow-up 96).
export function EmptySlot({
  day,
  hour,
  onCreate,
  style,
}: {
  day: string;
  hour: number;
  onCreate: (start: SessionStart) => void;
  style: React.CSSProperties;
}) {
  const time = hourLabel(hour);
  return (
    <button
      type="button"
      aria-label={`Nueva sesión el ${formatLongDay(day)} a las ${time}`}
      onClick={() => onCreate({ date: day, time })}
      style={style}
      className="group absolute inset-x-1 flex items-start gap-1 rounded-control border border-dashed border-transparent px-2 py-1 text-ayuda font-medium text-primario-profundo hover:border-primario hover:bg-hover-fila focus-visible:border-primario focus-visible:bg-hover-fila focus-visible:shadow-foco-solido"
    >
      <span
        aria-hidden="true"
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <Plus size={14} strokeWidth={1.8} />
        {time}
      </span>
    </button>
  );
}
