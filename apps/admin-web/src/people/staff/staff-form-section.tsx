import { useId, type ReactNode } from "react";

/**
 * FIX-091 (W14 A): «Editar miembro» reads as one page by sections, each
 * under a small Rosa profundo title (Datos, Rol y sucursales, Código de
 * invitación).
 */
export function StaffFormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h3
        id={id}
        className="font-sans text-etiqueta-campo font-semibold tracking-[0.14em] text-rosa-profundo uppercase"
      >
        {title}
      </h3>
      {children}
    </section>
  );
}
