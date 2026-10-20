import type { AdminPromotionContactDto } from "@pilates/api-contracts";
import { cn } from "../../lib/cn";
import { kindLabel } from "./contacts-csv";

// Follow-up 104: «Activa» on Palo de rosa tinte, «Cuenta cerrada» neutral.
export function KindPill({ contact }: { contact: AdminPromotionContactDto }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-2.5 text-ayuda font-medium",
        contact.kind === "client"
          ? "bg-primario-tinte text-primario-sobre-tinte"
          : "bg-borde-fuerte/35 text-texto-secundario",
      )}
    >
      {kindLabel(contact)}
    </span>
  );
}
