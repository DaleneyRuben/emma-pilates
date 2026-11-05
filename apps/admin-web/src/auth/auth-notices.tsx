import type { LucideIcon } from "lucide-react";
import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

// P10 (follow-ups 237–239): the notices of the sign-in screens. A Lino row
// with a 36 px disc; Error colours only when something failed.

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
      className="flex items-center gap-3 rounded-[14px] bg-lino px-3.5 py-3 text-cuerpo text-texto"
    >
      <span className="flex size-9 flex-none items-center justify-center rounded-full bg-rosa-tinte text-primario">
        <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <span>{children}</span>
    </p>
  );
}

/** A request that failed: neutral wording, Error only in the icon. */
export function WarningRow({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-center gap-3 rounded-[14px] bg-lino px-3.5 py-3 text-cuerpo text-texto"
    >
      <span className="flex size-9 flex-none items-center justify-center rounded-full bg-error-tinte text-error">
        <CircleAlert size={18} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <span>{children}</span>
    </p>
  );
}

/** The 72 px disc above a message screen such as «Revisa tu correo». */
export function MessageDisc({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-[72px] items-center justify-center rounded-full bg-rosa-tinte text-primario">
      <Icon size={32} strokeWidth={1.4} aria-hidden="true" />
    </span>
  );
}
