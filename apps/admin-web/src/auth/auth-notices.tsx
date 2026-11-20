import type { LucideIcon } from "lucide-react";
import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

// P10 (follow-ups 237–239): the notices of the sign-in screens. FIX-089:
// a Crema row with an Arcilla border and the icon alone, no disc behind it.

/** Information the page was opened with, such as «Tu sesión terminó». */
export function InfoRow({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <p
      role="status"
      className="flex items-center gap-3 rounded-tarjeta bg-superficie shadow-tarjeta px-3.5 py-3 text-cuerpo text-texto"
    >
      <Icon
        size={20}
        strokeWidth={1.6}
        aria-hidden="true"
        className="flex-none text-rosa-600"
      />
      <span>{children}</span>
    </p>
  );
}

/** A request that failed: neutral wording, Error only in the icon. */
export function WarningRow({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-center gap-3 rounded-tarjeta bg-superficie shadow-tarjeta px-3.5 py-3 text-cuerpo text-texto"
    >
      <CircleAlert
        size={20}
        strokeWidth={1.6}
        aria-hidden="true"
        className="flex-none text-rosa-600"
      />
      <span>{children}</span>
    </p>
  );
}

/** The icon above a message screen such as «Revisa tu correo», no disc. */
export function MessageDisc({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <Icon
      size={40}
      strokeWidth={1.4}
      aria-hidden="true"
      className="text-rosa-600"
    />
  );
}
