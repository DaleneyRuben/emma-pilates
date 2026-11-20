import type { AdminPromotionContactDto } from "@pilates/api-contracts";
import { createColumnHelper } from "@tanstack/react-table";
import { ClientPhoto } from "../../../components/client-photo";
import { StatusPill } from "../../../components/ui/status-pill";
import { phoneWithFlag } from "../../../lib/phone-number";
import { sinceDate } from "../clients-csv";
import { WithdrawContactAction } from "./withdraw-contact-action";

const columns = createColumnHelper<AdminPromotionContactDto>();

// Follow-up 268 (267's option A): a former Client has no ficha, so her row
// shows only what she left: her contact, since when she receives promotions,
// the «Cuenta cerrada» pill, and «Dejar de enviar».
export const closedAccountColumns = (onWithdrawn: (notice: string) => void) => [
  columns.accessor("name", {
    header: "Nombre",
    cell: ({ row }) => (
      <span className="flex items-center gap-2.5">
        <ClientPhoto name={row.original.name} photo={null} />
        <span className="text-cuerpo font-bold text-texto">
          {row.original.name}
        </span>
      </span>
    ),
  }),
  columns.accessor("email", {
    header: "Contacto",
    cell: ({ row }) => (
      <span className="flex flex-col text-nota text-texto">
        <span className="break-all">{row.original.email}</span>
        {/* No «Celular incompleto» warning: nobody can complete it now. */}
        {row.original.phone === null ? (
          <span className="text-texto">—</span>
        ) : (
          <span className="tabular text-texto">
            {phoneWithFlag(row.original.phone)}
          </span>
        )}
      </span>
    ),
  }),
  columns.accessor("since", {
    header: "Recibe promociones desde",
    meta: { card: "hidden" },
    cell: ({ row }) => (
      <span className="text-texto tabular">{sinceDate(row.original)}</span>
    ),
  }),
  columns.display({
    id: "state",
    header: "Estado",
    cell: () => <StatusPill tone="neutral">Cuenta cerrada</StatusPill>,
  }),
  columns.display({
    id: "withdraw",
    header: "",
    meta: { align: "right" },
    cell: ({ row }) => (
      <WithdrawContactAction contact={row.original} onWithdrawn={onWithdrawn} />
    ),
  }),
];
