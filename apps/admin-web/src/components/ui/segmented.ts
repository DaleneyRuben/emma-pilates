// Rosa Emma (rw.py tabs): page tabs, a tab's views and a panel's tabs as one
// white segmented bar with the card shadow; the chosen segment is solid Rosa
// profundo with white text of the same weight (follow-up 285, rule 4), a count
// rides on it as a small pill. A view or a panel's tab is the compact
// segment.
export const segmentedBarClass =
  "inline-flex max-w-full flex-wrap gap-1 self-start rounded-[16px] bg-superficie p-1 shadow-tarjeta";

export const segmentClass =
  "inline-flex h-10 items-center gap-2 rounded-panel px-[18px] tipo-titulo-fila whitespace-nowrap text-texto hover:bg-superficie-hundida focus-visible:shadow-foco";

export const segmentCurrentClass =
  "bg-primario text-sobre-primario hover:bg-primario focus-visible:shadow-foco-solido";

export const segmentBadgeClass =
  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 tipo-pastilla tabular";

export const segmentCompactClass = "h-9 px-3.5 tipo-compacto";
