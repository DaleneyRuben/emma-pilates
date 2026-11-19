import { formatListDate } from "@pilates/api-contracts";
import type { AdminClientDto } from "@pilates/api-contracts";
import { createColumnHelper } from "@tanstack/react-table";
import { RowOpener } from "../../catalog/catalog-page";
import { ClientPhoto } from "../../components/client-photo";
import { StatusPill } from "../../components/ui/status-pill";
import { ClientPhone } from "./client-phone";

const columns = createColumnHelper<AdminClientDto>();

const none = <span className="text-texto-muy-tenue">—</span>;

// Walkthrough n.º 61: «5 de 8 + 1» when extra classes are live.
export const classesLeft = (
  remaining: number,
  original: number | null | undefined,
  extra: number | null | undefined,
): string =>
  `${remaining} de ${original ?? remaining}${extra ? ` + ${extra}` : ""}`;

// P03's «Vence»: the active Plan's last day, or when the last one ended.
const endsLabel = (client: AdminClientDto): string | null => {
  if (client.planEndsOn === null) return null;
  const date = formatListDate(client.planEndsOn);
  return client.subscriptionStatus === "active" ? date : `Venció el ${date}`;
};

// AW21 on P03 (follow-up 232): Clienta (with her Fundadora number), Contacto,
// Plan, Le quedan, Vence, Invitada por, Estado.
export const clientColumns = (open: (row: AdminClientDto) => void) => [
  columns.accessor("name", {
    header: "Clienta",
    cell: ({ row }) => (
      <span className="flex items-center gap-2.5">
        <ClientPhoto name={row.original.name} photo={row.original.photo} />
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
      </span>
    ),
  }),
  columns.accessor("email", {
    header: "Contacto",
    meta: { card: "hidden" },
    cell: ({ row }) => (
      <span className="flex flex-col text-nota text-texto-secundario">
        <span>{row.original.email}</span>
        <ClientPhone phone={row.original.phone} tone="text-texto-muy-tenue" />
      </span>
    ),
  }),
  columns.accessor("planName", {
    header: "Plan",
    cell: ({ row }) => {
      const plan = row.original.planName;
      const startsOn = row.original.planStartsOn;
      if (plan !== null) {
        return (
          <span className="flex flex-col text-texto-secundario">
            <span>{plan}</span>
            {/* Walkthrough n.º 60: the Plan bought after a spent Guest Pass. */}
            {startsOn == null ? null : (
              <span className="text-ayuda text-texto-tenue tabular">
                Empieza el {formatListDate(startsOn)}
              </span>
            )}
          </span>
        );
      }
      // expired had a Plan; none never bought one (AdminClientDto.subscriptionStatus).
      return (
        <span className="text-texto-muy-tenue">
          {row.original.subscriptionStatus === "expired"
            ? "Plan vencido"
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
          {classesLeft(
            row.original.remainingClassAllowance,
            row.original.originalClassAllowance,
            row.original.extraClasses,
          )}
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
    meta: { card: "hidden" },
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
          return <StatusPill tone="exito">Activa</StatusPill>;
        case "expired":
          return <StatusPill tone="error">Plan vencido</StatusPill>;
        default:
          // Never bought a Plan: nothing expired (follow-up 54).
          return <StatusPill tone="neutral">Sin plan</StatusPill>;
      }
    },
  }),
];
