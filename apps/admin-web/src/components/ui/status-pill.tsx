import { cn } from "../../lib/cn";

const exceptions = {
  advertencia:
    "bg-advertencia/15 text-advertencia-texto [&>span]:bg-advertencia",
  error: "bg-error/15 text-error-texto [&>span]:bg-error",
} as const;

type Tone = keyof typeof exceptions | "exito" | "neutral";

// Design system → Status pills: a tint of the semantic color, its darker
// text tone, and a 6 px dot so the state never rests on color alone.
// FIX-088 (design audit, round 2): a pill only for an exception (Advertencia,
// Error); a normal state («Activo», «Confirmado», «Revisado») is plain grey
// text.
export function StatusPill({
  tone,
  children,
}: {
  tone: Tone;
  children: string;
}) {
  if (tone === "exito" || tone === "neutral") {
    return (
      <span className="text-pie whitespace-nowrap text-texto-tenue">
        {children}
      </span>
    );
  }
  return (
    <span
      data-status-pill=""
      className={cn(
        "inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-pie font-semibold whitespace-nowrap",
        exceptions[tone],
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full" />
      {children}
    </span>
  );
}
