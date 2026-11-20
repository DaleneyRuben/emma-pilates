import { cn } from "../../lib/cn";

type Tone = "accion" | "advertencia" | "error" | "exito" | "neutral";

const pill =
  "inline-flex h-7 items-center rounded-full px-3 tipo-pastilla whitespace-nowrap";

// Rosa Emma (v3_rosa.py pill): a state as a pill whose look says how much it
// asks. A calm state («Activa», «Confirmado», «Anulado») is the soft 50 pill
// with a Rubor ring; an exception (Advertencia, Error) is the white pill with
// an Arcilla ring; what waits for someone's action is solid Rosa profundo.
// The word carries the state, never a colour. Only the exceptions and the
// action carry `data-status-pill`.
export function StatusPill({
  tone,
  children,
}: {
  tone: Tone;
  children: string;
}) {
  if (tone === "exito" || tone === "neutral") {
    return (
      <span
        data-status="calma"
        className={cn(
          pill,
          "bg-superficie-hundida text-texto inset-ring inset-ring-borde",
        )}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      data-status-pill=""
      className={cn(
        pill,
        tone === "accion"
          ? "bg-primario text-sobre-primario"
          : "bg-superficie text-texto inset-ring-[1.5px] inset-ring-borde-fuerte",
      )}
    >
      {children}
    </span>
  );
}
