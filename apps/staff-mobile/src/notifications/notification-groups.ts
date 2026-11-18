import type { NotificationDto } from "@pilates/api-contracts";

export type NotificationEntry =
  | { kind: "single"; key: string; notification: NotificationDto }
  | {
      kind: "group";
      key: string;
      label: string;
      items: NotificationDto[];
      unreadCount: number;
    };

// FIX-083 (Notificaciones, pick A): the plural line a group of each kind reads.
// A group counts read notices too, so the copy never calls them «nuevos».
const plurals: Record<string, string> = {
  evaluation_booked: "evaluaciones agendadas",
  evaluation_cancelled: "evaluaciones canceladas",
  evaluation_rescheduled: "evaluaciones reprogramadas",
  feedback_received: "comentarios",
  freeze_requested: "congelamientos por revisar",
  payment_confirmed: "pagos confirmados",
  payment_submitted: "comprobantes por revisar",
  session_assigned: "clases asignadas",
  session_cancelled: "clases canceladas",
};

function groupLabel(type: string, items: NotificationDto[]): string {
  const plural = plurals[type];
  if (plural !== undefined) return `${items.length} ${plural}`;
  return `${items[0]?.title ?? "Avisos"} · ${items.length}`;
}

/**
 * Notices of the same type collapse into one row («6 comentarios nuevos»);
 * a lone notice stays its own row. Entries keep the inbox's newest-first
 * order by their newest notice.
 */
export function groupNotifications(items: readonly NotificationDto[]): NotificationEntry[] {
  const byType = new Map<string, NotificationDto[]>();
  for (const item of items) {
    const same = byType.get(item.type);
    if (same === undefined) byType.set(item.type, [item]);
    else same.push(item);
  }
  return [...byType.entries()].map(([type, same]): NotificationEntry => {
    const [first] = same;
    if (same.length === 1 && first !== undefined) {
      return { kind: "single", key: first.id, notification: first };
    }
    return {
      kind: "group",
      key: type,
      label: groupLabel(type, same),
      items: same,
      unreadCount: same.filter((item) => !item.readAt).length,
    };
  });
}
