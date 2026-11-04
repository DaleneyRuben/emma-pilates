import type { AdminPath } from "../app/navigation";
import { countFormat } from "../components/table/pagination";
import { boliviaParts } from "../lib/bolivia-time";

export type PendingCounts = {
  payments: number;
  freezes: number;
  contactAlerts: number;
  feedback: number;
  lowStock: number;
  statements: number;
};

export type PendingKind = keyof PendingCounts;

export type PendingRow = {
  kind: PendingKind;
  count: number;
  title: string;
  note: string;
  to: AdminPath;
};

const counted = (count: number, one: string, many: string) =>
  `${countFormat.format(count)} ${count === 1 ? one : many}`;

/**
 * P01's «Por resolver», in the board's order: each waiting thing, what it
 * is, and the tab that settles it. Nothing waiting, no row.
 */
export function pendingRows(
  counts: PendingCounts,
  context: { branchName: string | undefined; monthLabel: string },
): PendingRow[] {
  const rows: (PendingRow | null)[] = [
    counts.payments === 0
      ? null
      : {
          kind: "payments",
          count: counts.payments,
          title: counted(
            counts.payments,
            "pago por revisar",
            "pagos por revisar",
          ),
          note: "Transferencias y QR",
          to: "/dinero/pagos",
        },
    counts.freezes === 0
      ? null
      : {
          kind: "freezes",
          count: counts.freezes,
          title: counted(
            counts.freezes,
            "congelamiento por decidir",
            "congelamientos por decidir",
          ),
          note:
            counts.freezes === 1
              ? "Pedido desde la app"
              : "Pedidos desde la app",
          to: "/clientas/congelamientos",
        },
    counts.contactAlerts === 0
      ? null
      : {
          kind: "contactAlerts",
          count: counts.contactAlerts,
          title: counted(
            counts.contactAlerts,
            "clienta para contactar",
            "clientas para contactar",
          ),
          note: "Primeros 90 días sin reservar",
          to: "/clientas/para-contactar",
        },
    counts.feedback === 0
      ? null
      : {
          kind: "feedback",
          count: counts.feedback,
          title: counted(
            counts.feedback,
            "comentario nuevo",
            "comentarios nuevos",
          ),
          note: "Desde las apps",
          to: "/comentarios",
        },
    counts.lowStock === 0
      ? null
      : {
          kind: "lowStock",
          count: counts.lowStock,
          title: counted(
            counts.lowStock,
            "insumo con stock bajo",
            "insumos con stock bajo",
          ),
          note:
            context.branchName === undefined
              ? "La sucursal elegida"
              : `Sucursal ${context.branchName}`,
          to: "/estudio/insumos",
        },
    counts.statements === 0
      ? null
      : {
          kind: "statements",
          count: counts.statements,
          title: counted(
            counts.statements,
            "sueldo por aprobar",
            "sueldos por aprobar",
          ),
          note: context.monthLabel,
          to: "/dinero/sueldos",
        },
  ];
  return rows.filter((row): row is PendingRow => row !== null);
}

type DaySession = { startsAt: string; bookedCount: number; capacity: number };

/** P01's «Hoy en …»: today's classes, their bookings and the occupancy. */
export function todaySummary<Session extends DaySession>(
  sessions: readonly Session[],
  today: string,
): {
  classes: number;
  bookings: number;
  occupancyPercent: number | null;
  sessions: Session[];
} {
  const todays = sessions
    .filter((session) => boliviaParts(session.startsAt).date === today)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const bookings = todays.reduce((sum, session) => sum + session.bookedCount, 0);
  const capacity = todays.reduce((sum, session) => sum + session.capacity, 0);
  return {
    classes: todays.length,
    bookings,
    occupancyPercent:
      capacity === 0 ? null : Math.round((bookings / capacity) * 100),
    sessions: todays,
  };
}
