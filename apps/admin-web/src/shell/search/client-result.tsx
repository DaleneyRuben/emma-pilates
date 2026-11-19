import type { AdminClientDto } from "@pilates/api-contracts";
import { ChevronRight } from "lucide-react";
import { ClientPhoto } from "../../components/client-photo";

const planLine = (client: AdminClientDto): string => {
  if (client.planName === null) {
    return client.subscriptionStatus === "expired"
      ? "Plan vencido"
      : "Sin plan";
  }
  const left = client.remainingClassAllowance;
  if (left === null) return client.planName;
  return `${client.planName} · ${left} ${left === 1 ? "restante" : "restantes"}`;
};

/** «+591 70011001 · Mensual · 7 restantes», under her name. */
export const clientLine = (client: AdminClientDto): string =>
  `${client.phone === null || client.phone.trim() === "" ? "Sin teléfono" : client.phone} · ${planLine(client)}`;

// FIX-091 (W9 B): one match, her circle, name and the line to tell her apart.
export function ClientResult({ client }: { client: AdminClientDto }) {
  return (
    <>
      <ClientPhoto name={client.name} photo={client.photo} size={40} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium text-texto">{client.name}</span>
        <span className="truncate text-nota text-texto-tenue tabular">
          {clientLine(client)}
        </span>
      </span>
      <ChevronRight
        size={18}
        strokeWidth={1.6}
        aria-hidden="true"
        className="shrink-0 text-primario"
      />
    </>
  );
}
