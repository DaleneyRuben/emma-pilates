import type { AdminClientDto } from "@pilates/api-contracts";
import { createColumnHelper } from "@tanstack/react-table";
import { RowOpener } from "../../catalog/catalog-page";
import { StatusPill } from "../../components/ui/status-pill";
import { formatCivilDate } from "../../lib/bolivia-time";

const columns = createColumnHelper<AdminClientDto>();

const none = <span className="text-texto-muy-tenue">—</span>;

// P03's «Vence»: the active Plan's last day, or when the last one ended.
const endsLabel = (client: AdminClientDto): string | null => {
  if (client.planEndsOn === null) return null;
  const date = formatCivilDate(client.planEndsOn);
  return client.subscriptionStatus === "active" ? date : `Venció el ${date}`;
};

// AW21 on P03 (follow-up 232): Clienta (with her Fundadora number), Contacto,
// Plan, Le quedan, Vence, Invitada por, Estado.
export const clientColumns = (open: (row: AdminClientDto) => void) => [
  columns.accessor("name", {
    header: "Clienta",
    cell: ({ row }) => (
      <span className="flex flex-col items-start gap-0.5">
        <RowOpener
          label={row.original.name}
          onOpen={() => open(row.original)}
        />
        {row.original.founderNumber === null ? null : (
          <span className="text-ayuda text-rosa-enlace">
            Fundadora n.º {row.original.founderNumber}
          </span>
        )}
      </span>
    ),
  }),
  columns.accessor("email", {
    header: "Contacto",
    cell: ({ row }) => (
      <span className="flex flex-col text-nota text-texto-secundario">
        <span>{row.original.email}</span>
        {row.original.phone === null ? null : (
          <span className="text-texto-muy-tenue tabular">
            {row.original.phone}
          </span>
        )}
      </span>
    ),
  }),
  columns.accessor("planName", {
    header: "Plan",
    cell: ({ row }) => {
      const plan = row.original.planName;
      if (plan !== null) {
        return <span className="text-texto-secundario">{plan}</span>;
      }
      // expired had a Plan; none never bought one (AdminClientDto.subscriptionStatus).
      return (
        <span className="text-texto-muy-tenue">
          {row.original.subscriptionStatus === "expired"
            ? "Vencido"
            : "Sin plan"}
        </span>
      );
    },
  }),
  columns.accessor("remainingClassAllowance", {
    header: "Le quedan",
    cell: ({ row }) =>
      row.original.remainingClassAllowance === null ? (
        none
      ) : (
        <span className="text-texto tabular">
          {row.original.remainingClassAllowance} de{" "}
          {row.original.originalClassAllowance}
        </span>
      ),
  }),
  columns.accessor("planEndsOn", {
    header: "Vence",
    cell: ({ row }) => {
      const label = endsLabel(row.original);
      if (label === null) return none;
      return (
        <span
          className={
            row.original.subscriptionStatus === "active"
              ? "text-texto-secundario tabular"
              : "text-texto-tenue tabular"
          }
        >
          {label}
        </span>
      );
    },
  }),
  columns.accessor("invitedByName", {
    header: "Invitada por",
    cell: ({ getValue }) => {
      const name = getValue();
      return name === null ? (
        none
      ) : (
        <span className="text-texto-secundario">{name}</span>
      );
    },
  }),
  columns.accessor("subscriptionStatus", {
    header: "Estado",
    cell: ({ getValue }) => {
      switch (getValue()) {
        case "active":
          return <StatusPill tone="exito">Activo</StatusPill>;
        case "expired":
          return <StatusPill tone="error">Expirado</StatusPill>;
        default:
          // Never bought a Plan: nothing expired (follow-up 54).
          return <StatusPill tone="neutral">Sin plan</StatusPill>;
      }
    },
  }),
];
